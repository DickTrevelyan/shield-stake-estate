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
    /// @notice Custom errors for gas optimization and better debugging
    error PropertyDoesNotExist(uint256 propertyId);
    error PropertyNotActive(uint256 propertyId);
    error InvalidAmount(uint256 provided);
    error InvalidROI(uint8 provided);
    error NonceAlreadyUsed(address user, uint256 nonce);
    error InvalidSignature(address expected, address provided);
    error OnlyOwner(address caller, address owner);
    error PropertyAlreadyClosed(uint256 propertyId);
    error InvalidName();
    error InvalidLocation();
    error InvalidImageUrl();
    error ZeroAddress();

    /// @notice Represents a property available for investment (optimized layout)
    struct Property {
        uint256 targetAmount; // 32 bytes - slot 0
        uint256 currentAmount; // 32 bytes - slot 1
        address owner; // 20 bytes - slot 2 (packed with isActive and roi)
        bool isActive; // 1 byte - slot 2
        uint8 roi; // 1 byte - slot 2
        string name; // Reference to storage
        string location; // Reference to storage
        string imageUrl; // Reference to storage
    }

    /// @notice Packed property data for gas optimization (alternative storage)
    struct PackedProperty {
        uint128 targetAmount; // 16 bytes
        uint128 currentAmount; // 16 bytes
        address owner; // 20 bytes
        uint8 roi; // 1 byte
        bool isActive; // 1 byte
        // Total: 54 bytes, fits in 2 storage slots efficiently
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
        if (targetAmount == 0) revert InvalidAmount(targetAmount);
        if (roi == 0 || roi > 100) revert InvalidROI(roi);
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed(msg.sender, nonce);

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
        if (signer != msg.sender) revert InvalidSignature(msg.sender, signer);

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
        if (propertyId >= propertyCount) revert PropertyDoesNotExist(propertyId);
        if (!properties[propertyId].isActive) revert PropertyNotActive(propertyId);
        if (msg.value == 0) revert InvalidAmount(msg.value);
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed(msg.sender, nonce);

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
        if (signer != msg.sender) revert InvalidSignature(msg.sender, signer);

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
        if (propertyId >= propertyCount) revert PropertyDoesNotExist(propertyId);

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
        if (propertyId >= propertyCount) revert PropertyDoesNotExist(propertyId);
        if (usedNonces[msg.sender][nonce]) revert NonceAlreadyUsed(msg.sender, nonce);

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
        if (signer != msg.sender) revert InvalidSignature(msg.sender, signer);

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
        if (propertyId >= propertyCount) revert PropertyDoesNotExist(propertyId);
        return properties[propertyId];
    }

    /// @notice Closes a property (only owner can close)
    /// @param propertyId ID of the property to close
    function closeProperty(uint256 propertyId) external {
        if (propertyId >= propertyCount) revert PropertyDoesNotExist(propertyId);
        if (properties[propertyId].owner != msg.sender) revert OnlyOwner(msg.sender, properties[propertyId].owner);
        if (!properties[propertyId].isActive) revert PropertyAlreadyClosed(propertyId);

        properties[propertyId].isActive = false;
        emit PropertyClosed(propertyId);
    }

    /// @notice Gets all active properties (optimized version)
    /// @return Array of property IDs that are active
    function getActiveProperties() external view returns (uint256[] memory) {
        uint256 activeCount = 0;
        uint256 totalProperties = propertyCount;

        // First pass: count active properties
        for (uint256 i = 0; i < totalProperties; i++) {
            if (properties[i].isActive) {
                activeCount++;
            }
        }

        // Early return if no active properties
        if (activeCount == 0) {
            return new uint256[](0);
        }

        // Second pass: fill array with active property IDs
        uint256[] memory activePropertyIds = new uint256[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < totalProperties; i++) {
            if (properties[i].isActive) {
                activePropertyIds[index] = i;
                index++;
            }
        }

        return activePropertyIds;
    }

    /// @notice Batch check if multiple properties are active (gas optimization)
    /// @param propertyIds Array of property IDs to check
    /// @return Array of booleans indicating if each property is active
    function batchCheckActive(uint256[] calldata propertyIds) external view returns (bool[] memory) {
        bool[] memory isActiveArray = new bool[](propertyIds.length);
        
        for (uint256 i = 0; i < propertyIds.length; i++) {
            if (propertyIds[i] < propertyCount) {
                isActiveArray[i] = properties[propertyIds[i]].isActive;
            } else {
                isActiveArray[i] = false;
            }
        }
        
        return isActiveArray;
    }

    /// @notice Get property count (view function optimization)
    /// @return Total number of properties
    function getPropertyCount() external view returns (uint256) {
        return propertyCount;
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
    ) internal {
        if (targetAmount == 0) revert InvalidAmount();
        if (roi == 0 || roi > 100) revert InvalidROI();
        
        // Additional input validation
        if (bytes(name).length == 0) revert InvalidName();
        if (bytes(location).length == 0) revert InvalidLocation();
        if (bytes(imageUrl).length == 0) revert InvalidImageUrl();

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
