"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, TrendingUp, Lock, Eye } from "lucide-react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import type { Property } from "@/hooks/usePropertyStaking";
import { InvestModal } from "./InvestModal";
import { ViewStakeModal } from "./ViewStakeModal";

interface PropertyCardProps {
  property: Property;
  contractAddress: string;
}

export function PropertyCard({ property, contractAddress }: PropertyCardProps) {
  const { isConnected } = useAccount();
  const [showInvestModal, setShowInvestModal] = useState(false);
  const [showViewStakeModal, setShowViewStakeModal] = useState(false);

  const handleInvest = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to invest");
      return;
    }

    setShowInvestModal(true);
  };

  const handleViewStake = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet to view your stake");
      return;
    }

    setShowViewStakeModal(true);
  };

  const statusColors = {
    available: 'bg-success text-success-foreground',
    funded: 'bg-primary text-primary-foreground',
    completed: 'bg-muted text-muted-foreground',
  };

  const getStatus = () => {
    if (!property.isActive) return "completed";
    // Progress calculation (unused for now)
    // const progress = (property.currentAmount / property.targetAmount) * 100;
    if (property.currentAmount >= property.targetAmount) return "funded";
    return "available";
  };

  const status = getStatus();
  // const progress = Number((property.currentAmount * BigInt(100)) / property.targetAmount);

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="h-16 w-16 text-primary/40" />
        </div>
        <Badge className={`absolute top-3 right-3 ${statusColors[status]}`}>
          {status.toUpperCase()}
        </Badge>
      </div>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1">{property.name}</h3>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.location}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-encrypted/10 p-3 rounded-lg border border-encrypted/20">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="h-4 w-4 text-encrypted" />
            <span className="text-xs font-medium text-encrypted-foreground">Encrypted Value</span>
          </div>
          <p className="font-mono text-sm text-encrypted font-bold">
            0x{Math.random().toString(16).substr(2, 8).toUpperCase()}...{Math.random().toString(16).substr(2, 4).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg border border-accent/20">
          <span className="text-sm font-medium text-foreground">Expected ROI</span>
          <div className="flex items-center gap-1 text-accent font-bold">
            <TrendingUp className="h-4 w-4" />
            <span>{property.roi}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleInvest}
          disabled={status === "completed"}
        >
          {status === "completed" ? "Fully Funded" : "Invest Now"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewStake}
          className="flex items-center gap-1"
          disabled={!isConnected}
        >
          <Eye className="h-4 w-4" />
          View
        </Button>
      </CardFooter>

      <InvestModal
        isOpen={showInvestModal}
        onClose={() => setShowInvestModal(false)}
        property={property}
        contractAddress={contractAddress}
      />
      
      <ViewStakeModal
        isOpen={showViewStakeModal}
        onClose={() => setShowViewStakeModal(false)}
        property={property}
        contractAddress={contractAddress}
      />
    </Card>
  );
}
