import { Toaster } from "sonner";
import { Header } from "@/components/Header";
import { Providers } from "./providers";
import ClientOnly from "@/components/ClientOnly";
import "./globals.css";

export const metadata = {
  title: "SecureEstate - Blockchain Property Investment",
  description: "Invest in real estate securely with blockchain and FHE encryption",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-sans">
        <Providers>
          <div className="min-h-screen bg-background">
            <ClientOnly>
              <Header />
            </ClientOnly>
            <main>{children}</main>
          </div>
          <Toaster 
            position="top-right"
            expand={true}
            richColors={true}
          />
        </Providers>
      </body>
    </html>
  );
}
