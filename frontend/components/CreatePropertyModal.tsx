"use client";

import { useState } from "react";
import { parseEther, encodePacked, keccak256 } from "viem";
import { toast } from "sonner";
import { useAccount, useSignMessage, useChainId } from "wagmi";
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
import { Shield, Loader2, PlusCircle } from "lucide-react";
import { usePropertyStaking } from "@/hooks/usePropertyStaking";

interface CreatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractAddress: string;
}

export function CreatePropertyModal({ isOpen, onClose, contractAddress }: CreatePropertyModalProps) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [roi, setRoi] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();
  const { createProperty } = usePropertyStaking(contractAddress);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!name.trim()) {
      newErrors.name = "Property name is required";
    } else if (name.length < 3) {
      newErrors.name = "Property name must be at least 3 characters";
    } else if (name.length > 100) {
      newErrors.name = "Property name must be less than 100 characters";
    }

    // Location validation
    if (!location.trim()) {
      newErrors.location = "Location is required";
    } else if (location.length < 5) {
      newErrors.location = "Location must be at least 5 characters";
    } else if (location.length > 200) {
      newErrors.location = "Location must be less than 200 characters";
    }

    // Image URL validation
    if (!imageUrl.trim()) {
      newErrors.imageUrl = "Image URL is required";
    } else if (!imageUrl.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i)) {
      newErrors.imageUrl = "Please enter a valid image URL (jpg, jpeg, png, gif, or webp)";
    }

    // Target amount validation
    if (!targetAmount.trim()) {
      newErrors.targetAmount = "Target amount is required";
    } else {
      const amount = parseFloat(targetAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrors.targetAmount = "Target amount must be greater than 0";
      } else if (amount < 0.1) {
        newErrors.targetAmount = "Target amount must be at least 0.1 ETH";
      } else if (amount > 10000) {
        newErrors.targetAmount = "Target amount must be less than 10,000 ETH";
      }
    }

    // ROI validation
    if (!roi.trim()) {
      newErrors.roi = "ROI is required";
    } else {
      const roiValue = parseInt(roi);
      if (isNaN(roiValue) || roiValue <= 0) {
        newErrors.roi = "ROI must be greater than 0";
      } else if (roiValue > 100) {
        newErrors.roi = "ROI must be less than or equal to 100";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    const roiNum = parseInt(roi);
    if (roiNum <= 0 || roiNum > 100) {
      toast.error("ROI must be between 1 and 100");
      return;
    }

    try {
      setIsLoading(true);

      const targetAmountWei = parseEther(targetAmount);
      const nonce = BigInt(Date.now());
      
      // Create message hash matching contract's signature verification
      // Contract expects: keccak256(abi.encodePacked("Create property", name, targetAmount, roi, nonce, address(this), block.chainid))
      const messageHash = keccak256(
        encodePacked(
          ['string', 'string', 'uint256', 'uint8', 'uint256', 'address', 'uint256'],
          ["Create property", name, targetAmountWei, roiNum, nonce, contractAddress as `0x${string}`, BigInt(chainId)]
        )
      );
      
      // Sign the message hash
      const signature = await signMessageAsync({ 
        message: { raw: messageHash as `0x${string}` }
      });

      // Submit the property creation to blockchain
      await createProperty(
        name,
        location,
        imageUrl,
        targetAmount,
        roiNum,
        nonce,
        signature as `0x${string}`
      );

      toast.success("🎉 Property created successfully! List refreshed.");
      
      // Reset form
      setName("");
      setLocation("");
      setImageUrl("");
      setTargetAmount("");
      setRoi("");
      onClose();

    } catch (error: any) {
      console.error("Property creation error:", error);
      if (error.message?.includes("User rejected") || error.message?.includes("User denied")) {
        toast.error("❌ Transaction cancelled by user");
      } else if (error.message?.includes("Nonce already used")) {
        toast.error("❌ This transaction was already processed. Please try again.");
      } else {
        toast.error(`❌ Property creation failed: ${error.shortMessage || error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      setLocation("");
      setImageUrl("");
      setTargetAmount("");
      setRoi("");
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-primary" />
            Create New Property
          </DialogTitle>
          <DialogDescription>
            Create a new property investment opportunity. All fields are required.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {!isConnected && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                ⚠️ Please connect your wallet to create a property
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Luxury Manhattan Apartment"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors({ ...errors, name: "" });
                }
              }}
              disabled={isLoading}
              className={errors.name ? "border-red-500" : ""}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              type="text"
              placeholder="Downtown Manhattan, NY"
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                if (errors.location) {
                  setErrors({ ...errors, location: "" });
                }
              }}
              disabled={isLoading}
              className={errors.location ? "border-red-500" : ""}
            />
            {errors.location && (
              <p className="text-sm text-red-500">{errors.location}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="imageUrl">Image URL</Label>
            <Input
              id="imageUrl"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                if (errors.imageUrl) {
                  setErrors({ ...errors, imageUrl: "" });
                }
              }}
              disabled={isLoading}
              className={errors.imageUrl ? "border-red-500" : ""}
            />
            {errors.imageUrl && (
              <p className="text-sm text-red-500">{errors.imageUrl}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount (ETH)</Label>
            <Input
              id="targetAmount"
              type="number"
              placeholder="50"
              value={targetAmount}
              onChange={(e) => {
                setTargetAmount(e.target.value);
                if (errors.targetAmount) {
                  setErrors({ ...errors, targetAmount: "" });
                }
              }}
              disabled={isLoading}
              min="0.01"
              step="0.01"
              className={errors.targetAmount ? "border-red-500" : ""}
            />
            {errors.targetAmount && (
              <p className="text-sm text-red-500">{errors.targetAmount}</p>
            )}
          </div>
              </div>

          <div className="space-y-2">
            <Label htmlFor="roi">Expected ROI (%)</Label>
            <Input
              id="roi"
              type="number"
              placeholder="12"
              value={roi}
              onChange={(e) => {
                setRoi(e.target.value);
                if (errors.roi) {
                  setErrors({ ...errors, roi: "" });
                }
              }}
              min="1"
              max="100"
              disabled={isLoading}
              className={errors.roi ? "border-red-500" : ""}
            />
            {errors.roi && (
              <p className="text-sm text-red-500">{errors.roi}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Expected annual return on investment (1-100%)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Signature Required</span>
            </div>
            <p className="text-xs text-blue-600">
              You will need to sign a message with your wallet to authorize this property creation.
            </p>
          </div>
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
            onClick={handleCreate}
            disabled={!isConnected || !name || !location || !imageUrl || !targetAmount || !roi || isLoading}
            className="bg-primary hover:bg-primary/90"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Property
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
