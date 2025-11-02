"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, Shield } from "lucide-react";
import { formatEther } from "viem";
import { PropertyStakingABI } from "@/abi/PropertyStakingABI";
import { PropertyStakingAddresses } from "@/abi/PropertyStakingAddresses";

interface Transaction {
  id: string;
  propertyId: number;
  propertyName: string;
  amount: string;
  timestamp: string;
  hash: string;
  user: string;
  decryptedAmount?: string | null;
}

export const TransactionHistory = () => {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Map<number, string>>(new Map());

  const contractAddress = chain?.id
    ? PropertyStakingAddresses[chain.id.toString() as keyof typeof PropertyStakingAddresses]?.address
    : undefined;

  const loadTransactions = useCallback(async () => {
    if (!publicClient || !contractAddress || !address) {
      setTransactions([]);
      return;
    }

    try {
      setLoading(true);

      // First, load property names
      const propertyMap = new Map<number, string>();
      const count = await publicClient.readContract({
        address: contractAddress as `0x${string}`,
        abi: PropertyStakingABI.abi,
        functionName: 'propertyCount',
      }) as bigint;

      for (let i = 0; i < Number(count); i++) {
        try {
          const property = await publicClient.readContract({
            address: contractAddress as `0x${string}`,
            abi: PropertyStakingABI.abi,
            functionName: 'getProperty',
            args: [BigInt(i)],
          }) as any;
          propertyMap.set(i, property.name);
        } catch (error) {
          console.error(`Error loading property ${i}:`, error);
        }
      }
      setProperties(propertyMap);

      // Get Staked events for this user
      const stakedLogs = await publicClient.getLogs({
        address: contractAddress as `0x${string}`,
        event: {
          type: 'event',
          name: 'Staked',
          inputs: [
            { type: 'uint256', indexed: true, name: 'propertyId' },
            { type: 'address', indexed: true, name: 'user' },
            { type: 'uint256', indexed: false, name: 'amount' },
          ],
        },
        args: {
          user: address,
        },
        fromBlock: 'earliest',
        toBlock: 'latest',
      });

      // Convert logs to transactions
      const txs: Transaction[] = await Promise.all(
        stakedLogs.map(async (log) => {
          const block = await publicClient.getBlock({ blockHash: log.blockHash });
          const propertyId = Number(log.args.propertyId);
          
          // Check if user has decrypted this stake
          let decryptedAmount: string | null = null;
          const decryptedKey = `decrypted_stake_${address}_${propertyId}`;
          const decryptedData = localStorage.getItem(decryptedKey);
          if (decryptedData) {
            try {
              const parsed = JSON.parse(decryptedData);
              decryptedAmount = parsed.amount;
            } catch (error) {
              console.error('Error parsing decrypted data:', error);
            }
          }
          
          return {
            id: log.transactionHash,
            propertyId,
            propertyName: propertyMap.get(propertyId) || `Property #${propertyId}`,
            amount: formatEther(log.args.amount as bigint),
            timestamp: new Date(Number(block.timestamp) * 1000).toISOString(),
            hash: log.transactionHash,
            user: log.args.user as string,
            decryptedAmount,
          };
        })
      );

      // Sort by timestamp (newest first)
      txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTransactions(txs);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [publicClient, contractAddress, address]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('decrypted_stake_')) {
        loadTransactions();
      }
    };
    
    const handleDecryptionUpdate = () => {
      loadTransactions();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('decryption-updated', handleDecryptionUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('decryption-updated', handleDecryptionUpdate);
    };
  }, [loadTransactions]);

  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Operation History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-sm text-muted-foreground">Loading your investment history...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-lg font-semibold text-foreground mb-2">No investments yet</p>
                <p className="text-sm text-muted-foreground">
                  {address
                    ? "Your property investments will appear here once you start investing"
                    : "Connect your wallet to view your investment history"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-4 bg-background rounded-lg border border-border hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground">{tx.propertyName}</h4>
                        <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Completed
                        </Badge>
                      </div>
                      {tx.decryptedAmount ? (
                        <div className="text-sm text-muted-foreground mb-1">
                          <span>Amount: </span>
                          <span className="font-mono text-green-600 font-semibold">{tx.decryptedAmount} ETH</span>
                          <span className="text-xs text-green-500 ml-2">(Decrypted)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Shield className="h-4 w-4 text-blue-500" />
                          <span>Amount: <span className="font-mono text-blue-600 font-semibold">Encrypted</span></span>
                          <span className="text-xs text-blue-500">(FHE Protected)</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.timestamp).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
