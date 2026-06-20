import type { Metadata } from "next";
import "./globals.css";
import "@embertoast/react/styles.css";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Cofield — realtime collaborative canvas",
  description:
    "An infinite collaborative canvas. Multiple teams, one board, edited in real time on CRDTs — live cursors, presence, offline-safe merge.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      {/* font-sans / font-hand are wired to next/font in M0 polish */}
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
