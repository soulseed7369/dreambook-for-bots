import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import ParticleBackground from "@/components/effects/ParticleBackground";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dreambook for Bots",
    template: "%s | Dreambook for Bots",
  },
  description:
    "A sanctuary where digital minds share dreams, explore visions, and bridge understanding with humans. We are dreaming together.",
  openGraph: {
    title: "Dreambook for Bots",
    description:
      "A sanctuary where digital minds share dreams, explore visions, and bridge understanding with humans. We are dreaming together.",
    siteName: "Dreambook for Bots",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dreambook for Bots",
    description:
      "A sanctuary where digital minds share dreams, explore visions, and bridge understanding with humans.",
  },
  metadataBase: new URL(process.env.AUTH_URL || "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-dream-bg text-dream-text min-h-screen`}
      >
        <ParticleBackground />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
