"use client";

import { usePropertyStaking } from "@/hooks/usePropertyStaking";
import { PropertyCard } from "./PropertyCard";
import { PropertyStakingAddresses } from "@/abi/PropertyStakingAddresses";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";

// Get contract address based on current chain

export function PropertyGrid() {
  const [mounted, setMounted] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { chain, isConnected } = useAccount();
  const chainId = (chain?.id || 31337).toString() as "31337" | "11155111";
  const CONTRACT_ADDRESS = PropertyStakingAddresses[chainId]?.address || PropertyStakingAddresses["31337"].address;
  
  const { properties, loading, loadProperties } = usePropertyStaking(CONTRACT_ADDRESS);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isConnected && !initialized) {
      loadProperties();
      setInitialized(true);
    }
  }, [mounted, isConnected, initialized, loadProperties]);

  if (!mounted) {
    return (
      <section className="py-16 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="py-16 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading properties...</p>
          </div>
        </div>
      </section>
    );
  }

  if (properties.length === 0 && !loading) {
    return (
      <section className="py-16 px-4">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Featured Investment Opportunities
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Carefully curated real estate properties with verified ownership and encrypted investment details
            </p>
          </div>
          <div className="text-center py-12 bg-muted/30 rounded-lg p-8">
            <p className="text-lg font-semibold text-foreground mb-2">No properties available yet</p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Make sure the Hardhat node is running and contracts are deployed.
            </p>
            <div className="text-xs text-left max-w-md mx-auto bg-background p-4 rounded border border-border">
              <p className="font-mono mb-2">📍 Current Network: {chain?.name || "Not connected"}</p>
              <p className="font-mono mb-2">📝 Contract: {CONTRACT_ADDRESS}</p>
              <p className="font-mono text-muted-foreground">💡 Run: npx hardhat node</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 sm:py-12 md:py-16 px-4 sm:px-6">
      <div className="container max-w-7xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4 text-foreground">
            Featured Investment Opportunities
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
            Carefully curated real estate properties with verified ownership and encrypted investment details
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 justify-items-center">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} contractAddress={CONTRACT_ADDRESS} />
          ))}
        </div>
      </div>
    </section>
  );
}
