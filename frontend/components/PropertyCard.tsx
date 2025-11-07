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
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 w-full max-w-sm mx-auto">
      <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <Lock className="h-12 w-12 sm:h-16 sm:w-16 text-primary/40" />
        </div>
        <Badge className={`absolute top-3 right-3 text-xs sm:text-sm ${statusColors[status]}`}>
          {status.toUpperCase()}
        </Badge>
      </div>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-bold mb-1 truncate">{property.name}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="truncate">{property.location}</span>
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div className="bg-encrypted/10 p-2 sm:p-3 rounded-lg border border-encrypted/20">
          <div className="flex items-center gap-1 sm:gap-2 mb-1">
            <Lock className="h-3 w-3 sm:h-4 sm:w-4 text-encrypted flex-shrink-0" />
            <span className="text-xs font-medium text-encrypted-foreground">Encrypted Value</span>
          </div>
          <p className="font-mono text-xs sm:text-sm text-encrypted font-bold break-all">
            0x{Math.random().toString(16).substr(2, 8).toUpperCase()}...{Math.random().toString(16).substr(2, 4).toUpperCase()}
          </p>
        </div>
        <div className="flex items-center justify-between p-2 sm:p-3 bg-accent/10 rounded-lg border border-accent/20">
          <span className="text-xs sm:text-sm font-medium text-foreground">Expected ROI</span>
          <div className="flex items-center gap-1 text-accent font-bold">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">{property.roi}%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2 pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:flex-1 text-xs sm:text-sm"
          onClick={handleViewStake}
          disabled={!isConnected}
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          View Stake
        </Button>
        <Button
          size="sm"
          className="w-full sm:flex-1 text-xs sm:text-sm"
          onClick={handleInvest}
          disabled={!isConnected || !property.isActive}
        >
          Invest Now
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
