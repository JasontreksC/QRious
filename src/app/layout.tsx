import type { Metadata } from "next";
import { Bagel_Fat_One, Geist, Geist_Mono, Jua } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const y2kDisplay = Jua({
  variable: "--font-y2k-display",
  weight: "400",
  display: "swap",
  preload: false,
});

const y2kBubble = Bagel_Fat_One({
  variable: "--font-y2k-bubble",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const audioNugget = localFont({
  src: "./fonts/AudioNugget.ttf",
  variable: "--font-audio-nugget",
  weight: "400",
  style: "normal",
  display: "swap",
});

const fluxDemo = localFont({
  src: "./fonts/FluxDemo.ttf",
  variable: "--font-flux-demo",
  weight: "400",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = {
  title: "QRious - QR 소개팅 사전조사",
  description: "소개팅 사전 접수 폼",
  icons: {
    icon: [
      { url: "/qr-heart.png?v=20260831", type: "image/png", sizes: "301x300" },
      { url: "/favicon.ico?v=20260831" },
    ],
    shortcut: "/qr-heart.png?v=20260831",
    apple: "/qr-heart.png?v=20260831",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${y2kDisplay.variable} ${y2kBubble.variable} ${audioNugget.variable} ${fluxDemo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
