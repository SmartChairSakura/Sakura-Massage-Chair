import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import KioskHeader from "@/components/KioskHeader";
import { LanguageProvider } from "@/lib/i18n";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plus-jakarta",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Sakura Zen - Kiosk Self-Service QRIS Kursi Pijat",
  description: "Self-service QRIS payment & IoT pulse integration for Sakura Zen Massage Chair",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#FBF9F9] text-[#1B1C1C] font-sans selection:bg-[#F8C8DC] selection:text-[#765162]">
        <LanguageProvider>
          <KioskHeader />
          <div className="flex-1 flex flex-col">{children}</div>
        </LanguageProvider>
      </body>
    </html>
  );
}
