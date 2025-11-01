import { task } from "hardhat/config";
import { parseEther } from "ethers";

task("create-properties", "Creates sample properties for testing")
  .setAction(async (taskArgs, hre) => {
    const { ethers, deployments } = hre;
    
    // Get the deployed contract
    const propertyStakingDeployment = await deployments.get("PropertyStaking");
    const PropertyStaking = await ethers.getContractAt(
      "PropertyStaking",
      propertyStakingDeployment.address
    );

    console.log("PropertyStaking contract address:", propertyStakingDeployment.address);

    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("Using account:", deployer.address);

    // Sample properties to create
    const properties = [
      {
        name: "Luxury Apartment Complex",
        location: "Downtown Manhattan, NY",
        imageUrl: "/api/placeholder/400/300",
        targetAmount: parseEther("50"), // 50 ETH
        roi: 12
      },
      {
        name: "Corporate Office Tower",
        location: "Financial District, SF",
        imageUrl: "/api/placeholder/400/300",
        targetAmount: parseEther("100"), // 100 ETH
        roi: 10
      },
      {
        name: "Premium Villa Estate",
        location: "Beverly Hills, CA",
        imageUrl: "/api/placeholder/400/300",
        targetAmount: parseEther("75"), // 75 ETH
        roi: 15
      }
    ];

    // Create each property
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      console.log(`\nCreating property ${i + 1}: ${property.name}...`);
      
      try {
        const tx = await PropertyStaking.createProperty(
          property.name,
          property.location,
          property.imageUrl,
          property.targetAmount,
          property.roi
        );
        
        await tx.wait();
        console.log(`✓ Property ${i + 1} created successfully!`);
      } catch (error) {
        console.error(`✗ Error creating property ${i + 1}:`, error);
      }
    }

    // Check total property count
    const propertyCount = await PropertyStaking.propertyCount();
    console.log(`\nTotal properties created: ${propertyCount}`);

    // Display property details
    console.log("\n--- Property Details ---");
    for (let i = 0; i < Number(propertyCount); i++) {
      const property = await PropertyStaking.getProperty(i);
      console.log(`Property ${i}:`);
      console.log(`  Name: ${property.name}`);
      console.log(`  Location: ${property.location}`);
      console.log(`  Target: ${ethers.formatEther(property.targetAmount)} ETH`);
      console.log(`  Current: ${ethers.formatEther(property.currentAmount)} ETH`);
      console.log(`  ROI: ${property.roi}%`);
      console.log(`  Active: ${property.isActive}`);
      console.log(`  Owner: ${property.owner}`);
    }
  });

task("get-properties", "Gets all properties from the contract")
  .setAction(async (taskArgs, hre) => {
    const { ethers, deployments } = hre;
    
    try {
      const propertyStakingDeployment = await deployments.get("PropertyStaking");
      const PropertyStaking = await ethers.getContractAt(
        "PropertyStaking",
        propertyStakingDeployment.address
      );

      const propertyCount = await PropertyStaking.propertyCount();
      console.log(`Total properties: ${propertyCount}`);

      if (Number(propertyCount) == 0) {
        console.log("No properties found. Run 'npx hardhat create-properties --network localhost' to create sample properties.");
        return;
      }

      for (let i = 0; i < Number(propertyCount); i++) {
        const property = await PropertyStaking.getProperty(i);
        console.log(`\nProperty ${i}:`);
        console.log(`  Name: ${property.name}`);
        console.log(`  Location: ${property.location}`);
        console.log(`  Target: ${ethers.formatEther(property.targetAmount)} ETH`);
        console.log(`  Current: ${ethers.formatEther(property.currentAmount)} ETH`);
        console.log(`  ROI: ${property.roi}%`);
        console.log(`  Active: ${property.isActive}`);
      }
    } catch (error) {
      console.error("Error getting properties:", error);
    }
  });
