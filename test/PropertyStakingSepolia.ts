import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PropertyStaking } from "../types";
import { expect } from "chai";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("PropertyStaking on Sepolia", function () {
  let signers: Signers;
  let propertyStakingContract: PropertyStaking;
  let propertyStakingContractAddress: string;

  before(async function () {
    // Skip if running in mock mode
    if (fhevm.isMock) {
      console.warn(`This test suite is for Sepolia Testnet only`);
      this.skip();
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };

    // Get deployed contract address from deployments
    const deployment = await ethers.getContractAt("PropertyStaking", "0x0000000000000000000000000000000000000000");
    propertyStakingContractAddress = await deployment.getAddress();
    propertyStakingContract = deployment as PropertyStaking;
  });

  it("should interact with deployed contract on Sepolia", async function () {
    const propertyCount = await propertyStakingContract.propertyCount();
    console.log(`Current property count: ${propertyCount}`);
    expect(propertyCount).to.be.gte(0);
  });

  it("should create a property on Sepolia", async function () {
    const tx = await propertyStakingContract.createProperty(
      "Sepolia Test Villa",
      "Test Location",
      "https://example.com/test.jpg",
      ethers.parseEther("10"),
      10
    );
    await tx.wait();

    const propertyCount = await propertyStakingContract.propertyCount();
    console.log(`Property count after creation: ${propertyCount}`);

    const property = await propertyStakingContract.getProperty(propertyCount - 1n);
    expect(property.name).to.eq("Sepolia Test Villa");
    expect(property.isActive).to.eq(true);
  });

  it("should stake in a property on Sepolia", async function () {
    // Create a property first
    let tx = await propertyStakingContract.createProperty(
      "Sepolia Stake Test",
      "Test Location",
      "https://example.com/stake.jpg",
      ethers.parseEther("20"),
      12
    );
    await tx.wait();

    const propertyId = (await propertyStakingContract.propertyCount()) - 1n;

    // Create encrypted input using fhevm
    const encryptedInput = fhevm.createEncryptedInput(
      propertyStakingContractAddress,
      signers.alice.address
    );
    
    // Encrypt stake amount (1 ETH in wei)
    const stakeAmount = 1000000000000000000n;
    encryptedInput.add64(stakeAmount);
    const encrypted = await encryptedInput.encrypt();

    // Stake
    tx = await propertyStakingContract
      .connect(signers.alice)
      .stake(propertyId, encrypted.handles[0], encrypted.inputProof, {
        value: ethers.parseEther("1"),
      });
    await tx.wait();

    const property = await propertyStakingContract.getProperty(propertyId);
    expect(property.currentAmount).to.eq(ethers.parseEther("1"));
  });
});
