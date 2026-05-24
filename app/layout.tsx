import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { AppProviders } from "@/components/app-providers";
import { APP_NAME } from "@/lib/branding/app-name";
import { ADSENSE_CLIENT, ADSENSE_SCRIPT_SRC } from "@/lib/ads/adsense";
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
  title: APP_NAME,
  description: "Privacy-first voice AI assistant",
  icons: {
    icon: "/branding/icon.png",
    apple: "/branding/icon.png",
  },
  other: {
    "google-adsense-account": ADSENSE_CLIENT,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          async
          src={ADSENSE_SCRIPT_SRC}
          crossOrigin="anonymous"
        />
      </head>
      <body className="flex min-h-full flex-col">
        <AppProviders>
          <AppChrome>{children}</AppChrome>
        </AppProviders>
      </body>
    </html>
  );
}
