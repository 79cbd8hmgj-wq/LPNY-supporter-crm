import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-public-sans" });

export const metadata: Metadata = {
  title: "LPNY Supporter CRM",
  description: "Supporter and activist organizing CRM for LPNY",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={publicSans.variable} lang="en">
      <body>{children}</body>
    </html>
  );
}
