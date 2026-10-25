import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const plusJakarta = localFont({
  src: "../../public/fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-plus-jakarta",
  weight: "400 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLKSTAR Command Center",
  description: "Wall-mounted dashboard for the BLKSTAR operating system",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="light" className={`${plusJakarta.variable} h-full`}>
      <body className="font-[family-name:var(--font-plus-jakarta)] antialiased h-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
