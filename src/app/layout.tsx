import type { Metadata } from "next";
import { Outfit, Space_Mono } from "next/font/google";
import "./globals.css";
import { ImpersonationProvider } from "@/lib/contexts/ImpersonationContext";
import { ImpersonationBanner } from "@/components/ImpersonationBanner";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cold Marketing | AI Agents for Your Business",
  description: "Deploy AI agents that learn your business and automate marketing across the entire internet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${spaceMono.variable}`}>
      <body className="antialiased font-outfit">
        <ImpersonationProvider>
          <ImpersonationBanner />
          {children}
        </ImpersonationProvider>
      </body>
    </html>
  );
}
