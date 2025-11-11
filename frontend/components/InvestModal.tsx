"use client";

import { useState } from "react";
import { parseEther, formatEther, encodePacked, keccak256 } from "viem";
import { toast } from "sonner";
import { useAccount, useSignMessage, useConfig } from "wagmi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, Lock, Loader2, AlertCircle } from "lucide-react";
import { usePropertyStaking } from "@/hooks/usePropertyStaking";
import type { Property } from "@/hooks/usePropertyStaking";
import { encryptInvestmentAmount } from "@/lib/encryption";
import { useFhevmProvider } from "@/hooks/useFhevmProvider";

interface InvestModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: Property;
  contractAddress: string;
}

export function InvestModal({ isOpen, onClose, property, contractAddress }: InvestModalProps) {
  const [amount, setAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [encryptStep, setEncryptStep] = useState<"idle" | "encrypting" | "signing" | "submitting">("idle");
  
  const { address, isConnected, chain } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { stakeInProperty } = usePropertyStaking(contractAddress);
  const config = useConfig();
  const { instance: fhevmInstance, status: fhevmStatus } = useFhevmProvider();

  const handleInvest = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid investment amount");
      return;
    }

    const ethAmount = parseFloat(amount);
    if (ethAmount < 0.01) {
      toast.error("Minimum investment is 0.01 ETH");
      return;
    }

    try {
      setIsLoading(true);
      setEncryptStep("signing");

      const weiAmount = parseEther(amount.toString());
      const nonce = BigInt(Date.now());
      const chainId = chain?.id || 31337;
      
      // Create message hash matching contract's signature verification
      // Contract expects: keccak256(abi.encodePacked("Stake in property", propertyId, msg.value, nonce, address(this), block.chainid))
      const messageHash = keccak256(
        encodePacked(
          ['string', 'uint256', 'uint256', 'uint256', 'address', 'uint256'],
          ["Stake in property", BigInt(property.id), weiAmount, nonce, contractAddress as `0x${string}`, BigInt(chainId)]
        )
      );
      
      // Sign the message hash
      const investSignature = await signMessageAsync({ 
        message: { raw: messageHash as `0x${string}` }
      });

      // Check if FHEVM instance is ready
      if (!fhevmInstance) {
        toast.error("FHE encryption is initializing. Please wait...");
        setIsLoading(false);
        setEncryptStep("idle");
        return;
      }

      setEncryptStep("encrypting");
      
      // Encrypt the investment amount using FHEVM
      const encryptedData = await encryptInvestmentAmount(
        fhevmInstance,
        contractAddress,
        address,
        weiAmount
      );

      setEncryptStep("submitting");

      // Submit the encrypted investment to blockchain
      await stakeInProperty(
        property.id,
        weiAmount,
        encryptedData.encryptedAmount as `0x${string}`,
        encryptedData.proof as `0x${string}`,
        nonce,
        investSignature as `0x${string}`
      );

      // Store encrypted data locally for future decryption
      const storageKey = `encrypted_stake_${address}_${property.id}`;
      localStorage.setItem(storageKey, JSON.stringify({
        ...encryptedData,
        originalAmount: weiAmount.toString(),
        propertyId: property.id,
        timestamp: Date.now()
      }));

      toast.success("🎉 Investment successful! Your stake is encrypted on-chain. List refreshed.");
      
      // Reset form
      setAmount("");
      onClose();

    } catch (error: any) {
      console.error("Investment error:", error);
      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        toast.error("❌ Transaction cancelled by user");
      } else if (error.message?.includes("Nonce already used")) {
        toast.error("❌ This transaction was already processed. Please try again.");
      } else {
        toast.error(`❌ Investment failed: ${error.shortMessage || error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
      setEncryptStep("idle");
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setAmount("");
      setEncryptStep("idle");
      onClose();
    }
  };

  const getStepText = () => {
    switch (encryptStep) {
      case "signing":
        return "📝 Requesting signature...";
      case "encrypting":
        return "🔐 Encrypting amount...";
      case "submitting":
        return "⛓️ Submitting to blockchain...";
      default:
        return "Invest with Encryption";
    }
  };

  const getStepDescription = () => {
    switch (encryptStep) {
      case "signing":
        return "Please check your wallet and approve the signature request";
      case "encrypting":
        return "Your investment amount is being encrypted for privacy";
      case "submitting":
        return "Transaction is being submitted to the blockchain";
      default:
        return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Invest in {property.name}
          </DialogTitle>
          <DialogDescription>
            Enter the amount you wish to invest. Your investment will be encrypted for privacy.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isConnected && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                ⚠️ Please connect your wallet to invest
              </p>
            </div>
          )}
          
          {isConnected && fhevmStatus === "loading" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm text-blue-800">
                  🔐 Initializing FHE encryption system...
                </p>
              </div>
            </div>
          )}
          
          {isConnected && fhevmStatus === "error" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">
                  ❌ Failed to initialize FHE encryption. Please refresh the page.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Investment Amount (ETH)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Minimum investment: 0.01 ETH
            </p>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Privacy Protection</span>
              </div>
              <p className="text-xs text-blue-600">
                Your investment amount will be encrypted before being stored on-chain. 
                Only you can decrypt and view your exact investment amount.
              </p>
            </div>
          )}

          {encryptStep !== "idle" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  {getStepText()}
                </span>
              </div>
              {encryptStep === "signing" && (
                <p className="text-xs text-green-600 mt-1">
                  {getStepDescription()}
                </p>
              )}
              {encryptStep === "encrypting" && (
                <p className="text-xs text-green-600 mt-1">
                  {getStepDescription()}
                </p>
              )}
              {encryptStep === "submitting" && (
                <p className="text-xs text-green-600 mt-1">
                  {getStepDescription()}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleInvest}
            disabled={!isConnected || !amount || parseFloat(amount) <= 0 || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {getStepText()}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Invest Securely
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
