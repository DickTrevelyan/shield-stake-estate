"use client";

import { TrendingUp, TrendingDown, DollarSign, Users } from "lucide-react";

export const Footer = () => {
  const stats = [
    { label: "Market Cap", value: "$2.4B", icon: DollarSign, trend: "+5.2%" },
    { label: "Total Investors", value: "12,450", icon: Users, trend: "+8.1%" },
    { label: "Avg. ROI", value: "11.8%", icon: TrendingUp, trend: "+1.5%" },
    { label: "Properties", value: "248", icon: TrendingDown, trend: "-2.3%" },
  ];

  return (
    <footer className="border-t border-border bg-card py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="mb-8">
          <h3 className="text-xl font-bold text-foreground mb-6 text-center">
            Live Market Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const isPositive = stat.trend.startsWith("+");
              return (
                <div
                  key={index}
                  className="bg-background p-4 rounded-lg border border-border text-center hover:shadow-md transition-shadow"
                >
                  <Icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                  <p
                    className={`text-xs font-semibold ${
                      isPositive ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stat.trend}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground pt-8 border-t border-border">
          <p>© 2025 SecureEstate. All rights reserved. Powered by blockchain technology.</p>
          <p className="mt-2">Investment values are encrypted and secured on the Ethereum blockchain.</p>
        </div>
      </div>
    </footer>
  );
};
