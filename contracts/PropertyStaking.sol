// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint64, externalEuint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title PropertyStaking - A secure property investment platform using FHE
/// @notice Allows users to stake encrypted amounts in properties and view their encrypted stakes
/// @dev Uses Zama's FHE (Fully Homomorphic Encryption) for privacy-preserving staking
contract PropertyStaking is SepoliaConfig {
    /// @notice Represents a property available for investment
    struct Property {
        string name;
        string location;
        string imageUrl;
        uint256 targetAmount; // Target amount in wei (public)
        uint256 currentAmount; // Current staked amount in wei (public)
        uint8 roi; // Expected ROI percentage (e.g., 12 for 12%)
        bool isActive;
        address owner;
    }

    /// @notice Mapping from property ID to Property details
    mapping(uint256 => Property) public properties;

    /// @notice Mapping from property ID to user address to encrypted stake amount
    mapping(uint256 => mapping(address => euint64)) private userStakes;

    /// @notice Total number of properties created
    uint256 public propertyCount;

    /// @notice Emitted when a new property is created
    event PropertyCreated(
        uint256 indexed propertyId,
        string name,
        string location,
        uint256 targetAmount,
        uint8 roi
    );

    /// @notice Emitted when a user stakes in a property
    event Staked(
        uint256 indexed propertyId,
        address indexed user,
        uint256 amount
    );

    /// @notice Mapping to track used nonces for signature replay protection
    mapping(address => mapping(uint256 => bool)) public usedNonces;

    /// @notice Emitted when a user unstakes from a property
    event Unstaked(
        uint256 indexed propertyId,
        address indexed user,
        uint256 amount
    );

    /// @notice Emitted when a property is closed
    event PropertyClosed(uint256 indexed propertyId);

    /// @notice Creates a new property for investment with signature verification
    /// @param name Name of the property
    /// @param location Location of the property
    /// @param imageUrl URL of the property image
    /// @param targetAmount Target investment amount in wei
    /// @param roi Expected ROI percentage
    /// @param nonce Unique nonce for replay protection
    /// @param signature User's signature authorizing this property creation
    function createProperty(
        string memory name,
        string memory location,
        string memory imageUrl,
        uint256 targetAmount,
        uint8 roi,
        uint256 nonce,
        bytes calldata signature
    ) external {
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(roi > 0 && roi <= 100, "ROI must be between 1 and 100");
        require(!usedNonces[msg.sender][nonce], "Nonce already used");

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "Create property",
                name,
                targetAmount,
                roi,
                nonce,
                address(this),
                block.chainid
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == msg.sender, "Invalid signature");

        // Mark nonce as used
        usedNonces[msg.sender][nonce] = true;

        uint256 propertyId = propertyCount++;

        properties[propertyId] = Property({
            name: name,
            location: location,
            imageUrl: imageUrl,
            targetAmount: targetAmount,
            currentAmount: 0,
            roi: roi,
            isActive: true,
            owner: msg.sender
        });

        emit PropertyCreated(propertyId, name, location, targetAmount, roi);
    }

    /// @notice Stakes an encrypted amount in a property with signature verification
    /// @param propertyId ID of the property to stake in
    /// @param encryptedAmount Encrypted stake amount
    /// @param inputProof Proof for the encrypted input
    /// @param nonce Unique nonce for replay protection
    /// @param signature User's signature authorizing this stake
    function stake(
        uint256 propertyId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof,
        uint256 nonce,
        bytes calldata signature
    ) external payable {
        require(propertyId < propertyCount, "Property does not exist");
        require(properties[propertyId].isActive, "Property is not active");
        require(msg.value > 0, "Must send ETH to stake");
        require(!usedNonces[msg.sender][nonce], "Nonce already used");

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "Stake in property",
                propertyId,
                msg.value,
                nonce,
                address(this),
                block.chainid
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == msg.sender, "Invalid signature");

        // Mark nonce as used
        usedNonces[msg.sender][nonce] = true;

        // Convert external encrypted input to internal encrypted type
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Add to user's encrypted stake
        euint64 currentStake = userStakes[propertyId][msg.sender];
        userStakes[propertyId][msg.sender] = FHE.add(currentStake, amount);

        // Update public current amount
        properties[propertyId].currentAmount += msg.value;

        // Allow this contract and the user to access the encrypted stake
        FHE.allowThis(userStakes[propertyId][msg.sender]);
        FHE.allow(userStakes[propertyId][msg.sender], msg.sender);

        emit Staked(propertyId, msg.sender, msg.value);
    }

    /// @notice Unstakes from a property
    /// @param propertyId ID of the property to unstake from
    /// @param encryptedAmount Encrypted amount to unstake
    /// @param inputProof Proof for the encrypted input
    function unstake(
        uint256 propertyId,
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external {
        require(propertyId < propertyCount, "Property does not exist");

        // Convert external encrypted input to internal encrypted type
        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);

        // Subtract from user's encrypted stake
        euint64 currentStake = userStakes[propertyId][msg.sender];
        userStakes[propertyId][msg.sender] = FHE.sub(currentStake, amount);

        // Note: In production, you would need to decrypt the amount to transfer the correct ETH
        // For this MVP, we'll use a simplified approach
        // This is a placeholder - actual implementation would require decryption oracle

        // Allow this contract and the user to access the updated encrypted stake
        FHE.allowThis(userStakes[propertyId][msg.sender]);
        FHE.allow(userStakes[propertyId][msg.sender], msg.sender);

        emit Unstaked(propertyId, msg.sender, 0); // Amount is encrypted, so we emit 0
    }

    /// @notice Gets the encrypted stake of a user for a property
    /// @param propertyId ID of the property
    /// @param user Address of the user
    /// @return Encrypted stake amount
    function getUserStake(
        uint256 propertyId,
        address user
    ) external view returns (euint64) {
        return userStakes[propertyId][user];
    }

    /// @notice Gets the encrypted stake with signature verification for decryption authorization
    /// @param propertyId ID of the property
    /// @param nonce Unique nonce for replay protection
    /// @param signature User's signature authorizing this decryption
    /// @return Encrypted stake amount
    function getUserStakeWithSignature(
        uint256 propertyId,
        uint256 nonce,
        bytes calldata signature
    ) external returns (euint64) {
        require(propertyId < propertyCount, "Property does not exist");
        require(!usedNonces[msg.sender][nonce], "Nonce already used");

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                "Decrypt stake",
                propertyId,
                nonce,
                address(this),
                block.chainid
            )
        );
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address signer = ECDSA.recover(ethSignedMessageHash, signature);
        require(signer == msg.sender, "Invalid signature");

        // Mark nonce as used
        usedNonces[msg.sender][nonce] = true;

        return userStakes[propertyId][msg.sender];
    }

    /// @notice Gets property details
    /// @param propertyId ID of the property
    /// @return Property details
    function getProperty(
        uint256 propertyId
    ) external view returns (Property memory) {
        require(propertyId < propertyCount, "Property does not exist");
        return properties[propertyId];
    }

    /// @notice Closes a property (only owner can close)
    /// @param propertyId ID of the property to close
    function closeProperty(uint256 propertyId) external {
        require(propertyId < propertyCount, "Property does not exist");
        require(
            properties[propertyId].owner == msg.sender,
            "Only owner can close property"
        );
        require(properties[propertyId].isActive, "Property already closed");

        properties[propertyId].isActive = false;
        emit PropertyClosed(propertyId);
    }

    /// @notice Gets all active properties
    /// @return Array of property IDs that are active
    function getActiveProperties() external view returns (uint256[] memory) {
        uint256 activeCount = 0;

        // Count active properties
        for (uint256 i = 0; i < propertyCount; i++) {
            if (properties[i].isActive) {
                activeCount++;
            }
        }

        // Create array of active property IDs
        uint256[] memory activePropertyIds = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < propertyCount; i++) {
            if (properties[i].isActive) {
                activePropertyIds[index] = i;
                index++;
            }
        }

        return activePropertyIds;
    }

    /// @notice Initialize contract with sample properties
    constructor() {
        // Create sample properties for demonstration using internal creation logic
        _createInitialProperty(
            "Luxury Manhattan Apartment",
            "Downtown Manhattan, NY",
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400",
            50 ether,
            12
        );
        
        _createInitialProperty(
            "Silicon Valley Office Tower", 
            "Financial District, SF",
            "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400",
            75 ether,
            10
        );
        
        _createInitialProperty(
            "Beverly Hills Villa Estate",
            "Beverly Hills, CA", 
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400",
            100 ether,
            15
        );
    }

    /// @notice Internal function to create initial properties in constructor
    function _createInitialProperty(
        string memory name,
        string memory location,
        string memory imageUrl,
        uint256 targetAmount,
        uint8 roi
    ) public {
        require(targetAmount > 0, "Target amount must be greater than 0");
        require(roi > 0 && roi <= 100, "ROI must be between 1 and 100");

        uint256 propertyId = propertyCount++;

        properties[propertyId] = Property({
            name: name,
            location: location,
            imageUrl: imageUrl,
            targetAmount: targetAmount,
            currentAmount: 0,
            roi: roi,
            isActive: true,
            owner: msg.sender
        });

        emit PropertyCreated(propertyId, name, location, targetAmount, roi);
    }

    /// @notice Allows contract to receive ETH
    receive() external payable {}
}
