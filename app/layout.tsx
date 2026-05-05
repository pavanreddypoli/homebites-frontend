import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import ClientShell from "@/components/ClientShell";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HomeBites — home-cooked meals from your neighbors",
  description: "Discover home cooks near you. Every kitchen has a story — and a flavor you can't get anywhere else.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
        <ClientShell />
        <footer className="border-t border-gray-200 py-8 px-4">
          <div className="max-w-5xl mx-auto flex flex-col items-center gap-3 text-sm text-gray-500">
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              <Link href="/legal/terms" className="hover:text-gray-800 transition-colors">
                Terms
              </Link>
              <Link href="/legal/privacy" className="hover:text-gray-800 transition-colors">
                Privacy
              </Link>
              <Link href="/legal/chef-agreement" className="hover:text-gray-800 transition-colors">
                Chef Agreement
              </Link>
            </nav>
            <p>© {new Date().getFullYear()} RedCube Group LLC d/b/a HomeBites AI</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
