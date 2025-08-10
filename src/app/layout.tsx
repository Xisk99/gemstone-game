import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gemstone Reward Mining Rush",
  description: "Mine precious gems in this thrilling arcade game! Collect gems, avoid rocks, and earn rewards while having fun. Play Gemstone Mining Rush and compete for the highest score in this addictive web3 gaming experience. Earn passive USDC rewards by holding $GEM tokens!",
  keywords: "mining game, gems, arcade game, web3, blockchain gaming, $GEM token, USDC rewards, Solana, GameFi",
  authors: [{ name: "Xisk99", url: "https://x.com/xisk_99" }],
  creator: "Xisk99",
  publisher: "Gemstone Rewards",
  robots: "index, follow",
  openGraph: {
    title: "Gemstone Reward Mining Rush",
    description: "Mine precious gems and earn rewards! Thrilling arcade gaming experience with $GEM token rewards.",
    type: "website",
    images: [
      {
        url: "/game/gem_logo.png",
        width: 800,
        height: 600,
        alt: "Gemstone Mining Rush Game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Gemstone Reward Mining Rush",
    description: "Mine precious gems and earn rewards! Thrilling arcade gaming experience.",
    images: ["/game/gem_logo.png"],
    creator: "@xisk_99",
  },
  icons: {
    icon: "/game/gem_logo.png",
    shortcut: "/game/gem_logo.png",
    apple: "/game/gem_logo.png",
  },
  manifest: "/manifest.json",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
