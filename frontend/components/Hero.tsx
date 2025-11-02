"use client";

import { useState } from 'react';
import { Shield, Lock, TrendingUp, PlusCircle } from 'lucide-react';
import { Button } from './ui/button';
import { CreatePropertyModal } from './CreatePropertyModal';
import { PropertyStakingAddresses } from '@/abi/PropertyStakingAddresses';
import { useAccount } from 'wagmi';

export const Hero = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { chain } = useAccount();
  const chainId = (chain?.id || 31337).toString() as "31337" | "11155111";
  const CONTRACT_ADDRESS = PropertyStakingAddresses[chainId]?.address || PropertyStakingAddresses["31337"].address;

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Invest in Real Estate Securely
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Blockchain-powered property investments with encrypted transaction details and verified ownership records
        </p>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="mb-8 bg-primary hover:bg-primary/90"
          size="lg"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          Create New Property
        </Button>
        <div className="flex flex-wrap justify-center gap-8 mt-12">
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-sm border border-border">
            <Shield className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-foreground">Encrypted Data</p>
              <p className="text-sm text-muted-foreground">Full Privacy Protection</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-sm border border-border">
            <Lock className="h-8 w-8 text-primary" />
            <div className="text-left">
              <p className="font-semibold text-foreground">Secure Ownership</p>
              <p className="text-sm text-muted-foreground">Blockchain Verified</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-sm border border-border">
            <TrendingUp className="h-8 w-8 text-accent" />
            <div className="text-left">
              <p className="font-semibold text-foreground">High Returns</p>
              <p className="text-sm text-muted-foreground">8-15% Annual ROI</p>
            </div>
          </div>
        </div>
      </div>
      <CreatePropertyModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        contractAddress={CONTRACT_ADDRESS}
      />
    </section>
  );
};
