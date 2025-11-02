"use client";

import { Shield } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export const Header = () => {

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-foreground">SecureEstate</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Blockchain Protected
            </p>
          </div>
        </div>
        <ConnectButton
          label="Connect Wallet"
          accountStatus="address"
          chainStatus="full"
          showBalance={false}
        />
      </div>
    </header>
  );
};
