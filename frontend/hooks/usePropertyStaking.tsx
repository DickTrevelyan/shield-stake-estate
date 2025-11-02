"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useReadContract, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { toast } from "sonner";
import { PropertyStakingABI } from "@/abi/PropertyStakingABI";

export interface Property {
  id: number;
  name: string;
  location: string;
  imageUrl: string;
  targetAmount: bigint;
  currentAmount: bigint;
  roi: number;
  isActive: boolean;
  owner: string;
}

export function usePropertyStaking(contractAddress: string) {
  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  const publicClient = usePublicClient();
  
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);

  // Read property count
  const { data: propertyCount } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: PropertyStakingABI.abi,
    functionName: 'propertyCount',
  });

  // Load all properties from the blockchain
  const loadProperties = async () => {
    if (!publicClient || !contractAddress) return;
    
    try {
      setLoading(true);
      
      // Read property count from contract
      const count = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: PropertyStakingABI.abi,
        functionName: 'propertyCount',
      }) as bigint;

      const propertyCount = Number(count);
      
      if (propertyCount === 0) {
        setProperties([]);
        return;
      }

      // Load each property from the contract
      const loadedProperties: Property[] = [];
      for (let i = 0; i < propertyCount; i++) {
        try {
          const property = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: PropertyStakingABI.abi,
            functionName: 'getProperty',
            args: [BigInt(i)],
          }) as any;

          loadedProperties.push({
            id: i,
            name: property.name,
            location: property.location,
            imageUrl: property.imageUrl,
            targetAmount: property.targetAmount,
            currentAmount: property.currentAmount,
            roi: Number(property.roi),
            isActive: property.isActive,
            owner: property.owner,
          });
        } catch (error) {
          console.error(`Error loading property ${i}:`, error);
        }
      }
      
      setProperties(loadedProperties);
    } catch (error) {
      console.error("Error loading properties:", error);
      toast.error("Failed to load properties from blockchain");
    } finally {
      setLoading(false);
    }
  };

  // Load properties when component mounts or contract address changes
  useEffect(() => {
    if (contractAddress && publicClient) {
      loadProperties();
    }
  }, [contractAddress, publicClient]);

  // Create a new property using Wagmi with signature verification
  const createProperty = async (
    name: string,
    location: string,
    imageUrl: string,
    targetAmount: string,
    roi: number,
    nonce: bigint,
    signature: `0x${string}`
  ) => {
    if (!address) {
      throw new Error("Please connect your wallet");
    }

    const targetAmountWei = parseEther(targetAmount);

    const txHash = await writeContract({
      address: contractAddress as `0x${string}`,
      abi: PropertyStakingABI.abi,
      functionName: 'createProperty',
      args: [
        name,
        location,
        imageUrl,
        targetAmountWei,
        roi,
        nonce,
        signature,
      ],
    });
    
    // Wait for transaction to be mined and reload properties
    if (publicClient && txHash) {
      toast.info("⏳ Waiting for transaction confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      // Reload properties after successful creation
      await loadProperties();
    }
    
    return txHash;
  };

  // Stake in a property with encrypted amount
  const stakeInProperty = async (
    propertyId: number,
    value: bigint,
    encryptedAmount: `0x${string}`,
    inputProof: `0x${string}`,
    nonce: bigint,
    signature: `0x${string}`
  ) => {
    if (!address) {
      throw new Error("Please connect your wallet");
    }

    const txHash = await writeContract({
      address: contractAddress as `0x${string}`,
      abi: PropertyStakingABI.abi,
      functionName: 'stake',
      args: [BigInt(propertyId), encryptedAmount, inputProof, nonce, signature],
      value: value,
    });
    
    // Wait for transaction to be mined and reload properties
    if (publicClient && txHash) {
      toast.info("⏳ Waiting for transaction confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: txHash });
      // Reload properties to show updated amounts
      await loadProperties();
    }
    
    return txHash;
  };

  // Get user stake in a property - reads encrypted stake from blockchain
  const getUserStake = async (propertyId: number, userAddress: string) => {
    if (!publicClient || !contractAddress) return null;
    
    try {
      const stake = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: PropertyStakingABI.abi,
        functionName: 'getUserStake',
        args: [BigInt(propertyId), userAddress as `0x${string}`],
      }) as `0x${string}`;
      
      return stake;
    } catch (error) {
      console.error('Error reading user stake:', error);
      return null;
    }
  };

  return {
    properties,
    loading,
    createProperty,
    stakeInProperty,
    getUserStake,
    loadProperties,
    isConnected,
    address,
  };
}
