import type { Metadata } from "next";
import { Inter, Maven_Pro } from "next/font/google";

import "./globals.css";
import { LanguageProvider } from "@/context/LanguageContext";
import { Footer } from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const mavenPro = Maven_Pro({
  subsets: ['latin'],
  variable: '--font-maven',
  weight: ['400', '500', '600', '700', '800', '900']
})



export const metadata: Metadata = {
  title: "BoostMyDeal",
  description: "BoostMydeal ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${mavenPro.variable} antialiased`}
      > <LanguageProvider>
          <Header />
          <main>
            {children}
          </main>
          <Toaster />
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
