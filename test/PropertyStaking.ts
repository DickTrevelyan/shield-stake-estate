import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PropertyStaking, PropertyStaking__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

// Helper function to generate signature for staking
async function generateStakeSignature(
  signer: HardhatEthersSigner,
  propertyId: number,
  amount: bigint,
  nonce: number,
  contractAddress: string,
  chainId: number
): Promise<string> {
  const message = ethers.solidityPacked(
    ["string", "uint256", "uint256", "uint256", "address", "uint256"],
    ["Stake in property", propertyId, amount, nonce, contractAddress, chainId]
  );
  const messageHash = ethers.keccak256(message);
  return await signer.signMessage(ethers.getBytes(messageHash));
}

// Helper function to generate signature for property creation
async function generateCreatePropertySignature(
  signer: HardhatEthersSigner,
  name: string,
  targetAmount: bigint,
  roi: number,
  nonce: number,
  contractAddress: string,
  chainId: number
): Promise<string> {
  const message = ethers.solidityPacked(
    ["string", "string", "uint256", "uint8", "uint256", "address", "uint256"],
    ["Create property", name, targetAmount, roi, nonce, contractAddress, chainId]
  );
  const messageHash = ethers.keccak256(message);
  return await signer.signMessage(ethers.getBytes(messageHash));
}

// Helper function to generate signature for decryption
async function generateDecryptSignature(
  signer: HardhatEthersSigner,
  propertyId: number,
  nonce: number,
  contractAddress: string,
  chainId: number
): Promise<string> {
  const message = ethers.solidityPacked(
    ["string", "uint256", "uint256", "address", "uint256"],
    ["Decrypt stake", propertyId, nonce, contractAddress, chainId]
  );
  const messageHash = ethers.keccak256(message);
  return await signer.signMessage(ethers.getBytes(messageHash));
}

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PropertyStaking")) as PropertyStaking__factory;
  const propertyStakingContract = (await factory.deploy()) as PropertyStaking;
  const propertyStakingContractAddress = await propertyStakingContract.getAddress();

  return { propertyStakingContract, propertyStakingContractAddress };
}

describe("PropertyStaking", function () {
  let signers: Signers;
  let propertyStakingContract: PropertyStaking;
  let propertyStakingContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ propertyStakingContract, propertyStakingContractAddress } = await deployFixture());
  });

  it("should deploy successfully with initial properties", async function () {
    const propertyCount = await propertyStakingContract.propertyCount();
    expect(propertyCount).to.eq(3); // Constructor creates 3 initial properties

    // Check first property
    const property0 = await propertyStakingContract.getProperty(0);
    expect(property0.name).to.eq("Luxury Manhattan Apartment");
    expect(property0.location).to.eq("Downtown Manhattan, NY");
    expect(property0.targetAmount).to.eq(ethers.parseEther("50"));
    expect(property0.roi).to.eq(12);
    expect(property0.isActive).to.eq(true);

    // Check second property
    const property1 = await propertyStakingContract.getProperty(1);
    expect(property1.name).to.eq("Silicon Valley Office Tower");
    expect(property1.location).to.eq("Financial District, SF");
    expect(property1.targetAmount).to.eq(ethers.parseEther("75"));
    expect(property1.roi).to.eq(10);
    expect(property1.isActive).to.eq(true);

    // Check third property
    const property2 = await propertyStakingContract.getProperty(2);
    expect(property2.name).to.eq("Beverly Hills Villa Estate");
    expect(property2.location).to.eq("Beverly Hills, CA");
    expect(property2.targetAmount).to.eq(ethers.parseEther("100"));
    expect(property2.roi).to.eq(15);
    expect(property2.isActive).to.eq(true);
  });

  it("should create a new property", async function () {
    const initialCount = await propertyStakingContract.propertyCount();
    expect(initialCount).to.eq(3); // Should have 3 initial properties

    const nonce = Date.now();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const targetAmount = ethers.parseEther("100");
    const signature = await generateCreatePropertySignature(
      signers.deployer,
      "Luxury Villa",
      targetAmount,
      12,
      nonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    const tx = await propertyStakingContract.createProperty(
      "Luxury Villa",
      "Miami, FL", 
      "https://example.com/villa.jpg",
      targetAmount,
      12,
      nonce,
      signature
    );
    await tx.wait();

    const propertyCount = await propertyStakingContract.propertyCount();
    expect(propertyCount).to.eq(4); // Now should have 4 properties

    const newProperty = await propertyStakingContract.getProperty(3); // New property at index 3
    expect(newProperty.name).to.eq("Luxury Villa");
    expect(newProperty.location).to.eq("Miami, FL");
    expect(newProperty.targetAmount).to.eq(ethers.parseEther("100"));
    expect(newProperty.roi).to.eq(12);
    expect(newProperty.isActive).to.eq(true);
  });

  it("should stake encrypted amount in a property", async function () {
    // Use existing property (index 0) from constructor

    // Encrypt stake amount (1 ETH = 1000000000000000000 wei)
    const stakeAmount = 1000000000000000000n; // 1 ETH in wei
    const encryptedStake = await fhevm
      .createEncryptedInput(propertyStakingContractAddress, signers.alice.address)
      .add64(stakeAmount)
      .encrypt();

    // Generate signature for staking
    const nonce = Date.now();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const signature = await generateStakeSignature(
      signers.alice,
      0,
      ethers.parseEther("1"),
      nonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    // Stake with encrypted amount
    const stakeTx = await propertyStakingContract
      .connect(signers.alice)
      .stake(0, encryptedStake.handles[0], encryptedStake.inputProof, nonce, signature, {
        value: ethers.parseEther("1"),
      });
    await stakeTx.wait();

    // Check property current amount increased
    const property = await propertyStakingContract.getProperty(0);
    expect(property.currentAmount).to.eq(ethers.parseEther("1"));

    // Get encrypted user stake
    const encryptedUserStake = await propertyStakingContract.getUserStake(0, signers.alice.address);

    // Decrypt and verify
    const decryptedStake = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedUserStake,
      propertyStakingContractAddress,
      signers.alice
    );

    expect(decryptedStake).to.eq(stakeAmount);
  });

  it("should allow multiple users to stake in the same property", async function () {
    // Create a property with signature
    const createNonce = Date.now();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const targetAmount = ethers.parseEther("200");
    const createSignature = await generateCreatePropertySignature(
      signers.deployer,
      "Downtown Apartment",
      targetAmount,
      15,
      createNonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    let tx = await propertyStakingContract.createProperty(
      "Downtown Apartment",
      "New York, NY",
      "https://example.com/apartment.jpg",
      targetAmount,
      15,
      createNonce,
      createSignature
    );
    await tx.wait();

    // Alice stakes 2 ETH
    const aliceStakeAmount = 2000000000000000000n; // 2 ETH
    const encryptedAliceStake = await fhevm
      .createEncryptedInput(propertyStakingContractAddress, signers.alice.address)
      .add64(aliceStakeAmount)
      .encrypt();

    const aliceNonce = Date.now();
    const aliceSignature = await generateStakeSignature(
      signers.alice,
      0,
      ethers.parseEther("2"),
      aliceNonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    tx = await propertyStakingContract
      .connect(signers.alice)
      .stake(0, encryptedAliceStake.handles[0], encryptedAliceStake.inputProof, aliceNonce, aliceSignature, {
        value: ethers.parseEther("2"),
      });
    await tx.wait();

    // Bob stakes 3 ETH
    const bobStakeAmount = 3000000000000000000n; // 3 ETH
    const encryptedBobStake = await fhevm
      .createEncryptedInput(propertyStakingContractAddress, signers.bob.address)
      .add64(bobStakeAmount)
      .encrypt();

    const bobNonce = Date.now() + 1; // Different nonce
    const bobSignature = await generateStakeSignature(
      signers.bob,
      0,
      ethers.parseEther("3"),
      bobNonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    tx = await propertyStakingContract
      .connect(signers.bob)
      .stake(0, encryptedBobStake.handles[0], encryptedBobStake.inputProof, bobNonce, bobSignature, {
        value: ethers.parseEther("3"),
      });
    await tx.wait();

    // Check total staked amount
    const property = await propertyStakingContract.getProperty(0);
    expect(property.currentAmount).to.eq(ethers.parseEther("5"));

    // Verify Alice's stake
    const encryptedAliceUserStake = await propertyStakingContract.getUserStake(0, signers.alice.address);
    const decryptedAliceStake = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedAliceUserStake,
      propertyStakingContractAddress,
      signers.alice
    );
    expect(decryptedAliceStake).to.eq(aliceStakeAmount);

    // Verify Bob's stake
    const encryptedBobUserStake = await propertyStakingContract.getUserStake(0, signers.bob.address);
    const decryptedBobStake = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBobUserStake,
      propertyStakingContractAddress,
      signers.bob
    );
    expect(decryptedBobStake).to.eq(bobStakeAmount);
  });

  it("should get all active properties", async function () {
    // Initially should have 3 properties from constructor
    const initialActiveProperties = await propertyStakingContract.getActiveProperties();
    expect(initialActiveProperties.length).to.eq(3);
    expect(initialActiveProperties[0]).to.eq(0);
    expect(initialActiveProperties[1]).to.eq(1);
    expect(initialActiveProperties[2]).to.eq(2);

    // Create additional properties with signature
    const nonce = Date.now();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const targetAmount = ethers.parseEther("10");
    const signature = await generateCreatePropertySignature(
      signers.deployer,
      "Property 4",
      targetAmount,
      8,
      nonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    let tx = await propertyStakingContract.createProperty(
      "Property 4",
      "Location 4",
      "https://example.com/4.jpg",
      targetAmount,
      8,
      nonce,
      signature
    );
    await tx.wait();

    const finalActiveProperties = await propertyStakingContract.getActiveProperties();
    expect(finalActiveProperties.length).to.eq(4);
    expect(finalActiveProperties[3]).to.eq(3); // New property at index 3
  });

  it("should close a property", async function () {
    // Initially should have 3 active properties
    const initialActiveProperties = await propertyStakingContract.getActiveProperties();
    expect(initialActiveProperties.length).to.eq(3);

    // Close the first property (index 0)
    let tx = await propertyStakingContract.closeProperty(0);
    await tx.wait();

    const property = await propertyStakingContract.getProperty(0);
    expect(property.isActive).to.eq(false);

    // Check active properties list - should now have 2 active properties
    const activeProperties = await propertyStakingContract.getActiveProperties();
    expect(activeProperties.length).to.eq(2);
    expect(activeProperties[0]).to.eq(1); // Property at index 1
    expect(activeProperties[1]).to.eq(2); // Property at index 2
  });

  it("should not allow non-owner to close a property", async function () {
    // Create a property with signature
    const nonce = Date.now();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const targetAmount = ethers.parseEther("100");
    const signature = await generateCreatePropertySignature(
      signers.deployer,
      "Owner Test",
      targetAmount,
      15,
      nonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    let tx = await propertyStakingContract.createProperty(
      "Owner Test",
      "Test Location",
      "https://example.com/owner.jpg",
      targetAmount,
      15,
      nonce,
      signature
    );
    await tx.wait();

    // Try to close as Alice (not owner)
    await expect(
      propertyStakingContract.connect(signers.alice).closeProperty(0)
    ).to.be.revertedWith("Only owner can close property");
  });

  it("should not allow staking in inactive property", async function () {
    // Create and close a property with signature
    const createNonce = Date.now();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    const targetAmount = ethers.parseEther("50");
    const createSignature = await generateCreatePropertySignature(
      signers.deployer,
      "Inactive Property",
      targetAmount,
      10,
      createNonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    let tx = await propertyStakingContract.createProperty(
      "Inactive Property",
      "Test Location",
      "https://example.com/inactive.jpg",
      targetAmount,
      10,
      createNonce,
      createSignature
    );
    await tx.wait();

    tx = await propertyStakingContract.closeProperty(0);
    await tx.wait();

    // Try to stake in closed property
    const stakeAmount = 1000000000000000000n;
    const encryptedStake = await fhevm
      .createEncryptedInput(propertyStakingContractAddress, signers.alice.address)
      .add64(stakeAmount)
      .encrypt();

    const stakeNonce = Date.now() + 100;
    const signature = await generateStakeSignature(
      signers.alice,
      0,
      ethers.parseEther("1"),
      stakeNonce,
      propertyStakingContractAddress,
      Number(chainId)
    );

    await expect(
      propertyStakingContract
        .connect(signers.alice)
        .stake(0, encryptedStake.handles[0], encryptedStake.inputProof, stakeNonce, signature, {
          value: ethers.parseEther("1"),
        })
    ).to.be.revertedWith("Property is not active");
  });
});

describe("Edge Cases", function () {
  it("Should reject staking with zero amount", async function () {
    const { propertyStaking, owner } = await loadFixture(deployPropertyStakingFixture);
    
    const propertyId = 0;
    const amount = 0n;
    const nonce = 2;
    
    const signature = await generateStakeSignature(
      owner,
      propertyId,
      amount,
      nonce,
      await propertyStaking.getAddress(),
      (await ethers.provider.getNetwork()).chainId
    );

    const encryptedAmount = await fhevm.encrypt(amount);
    
    await expect(
      propertyStaking.stake(propertyId, encryptedAmount.handles[0], encryptedAmount.inputProof, nonce, signature, { value: 0 })
    ).to.be.revertedWith("Must send ETH to stake");
  });

  it("Should reject creating property with zero target amount", async function () {
    const { propertyStaking, owner } = await loadFixture(deployPropertyStakingFixture);
    
    const name = "Test Property";
    const location = "Test Location";
    const imageUrl = "https://test.com/image.jpg";
    const targetAmount = 0n;
    const roi = 10;
    const nonce = 3;
    
    const signature = await generateCreatePropertySignature(
      owner,
      name,
      targetAmount,
      roi,
      nonce,
      await propertyStaking.getAddress(),
      (await ethers.provider.getNetwork()).chainId
    );

    await expect(
      propertyStaking.createProperty(name, location, imageUrl, targetAmount, roi, nonce, signature)
    ).to.be.revertedWith("Target amount must be greater than 0");
  });

  it("Should reject ROI outside valid range", async function () {
    const { propertyStaking, owner } = await loadFixture(deployPropertyStakingFixture);
    
    const name = "Test Property";
    const location = "Test Location";
    const imageUrl = "https://test.com/image.jpg";
    const targetAmount = ethers.parseEther("50");
    const roi = 150; // Invalid ROI > 100
    const nonce = 4;
    
    const signature = await generateCreatePropertySignature(
      owner,
      name,
      targetAmount,
      roi,
      nonce,
      await propertyStaking.getAddress(),
      (await ethers.provider.getNetwork()).chainId
    );

    await expect(
      propertyStaking.createProperty(name, location, imageUrl, targetAmount, roi, nonce, signature)
    ).to.be.revertedWith("ROI must be between 1 and 100");
  });
});
