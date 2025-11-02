"use client";

import { useMemo, useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useFhevm } from "@/fhevm/useFhevm";
import type { Eip1193Provider } from "ethers";

/**
 * Hook to provide FHEVM instance for encryption/decryption
 * Automatically uses Mock for local chains (31337) and real FHE for Sepolia (11155111)
 */
export function useFhevmProvider() {
  const { connector } = useAccount();
  const publicClient = usePublicClient();
  const [provider, setProvider] = useState<Eip1193Provider | undefined>(undefined);
  
  // Get provider from wagmi connector (async)
  useEffect(() => {
    if (!connector) {
      setProvider(undefined);
      return;
    }
    
    connector.getProvider().then((p) => {
      setProvider(p as Eip1193Provider);
    }).catch(() => {
      setProvider(undefined);
    });
  }, [connector]);

  // Define which chains should use Mock FHE
  const initialMockChains = useMemo(() => {
    return {
      31337: "http://localhost:8545", // Local Hardhat network uses Mock
    } as const;
  }, []);

  const chainId = publicClient?.chain?.id;

  // Create FHEVM instance (will use Mock for chain 31337, real FHE for others)
  const { instance, status, error, refresh } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: !!provider,
  });

  return {
    instance,
    status,
    error,
    refresh,
    chainId,
    isMockChain: chainId === 31337,
  };
}
