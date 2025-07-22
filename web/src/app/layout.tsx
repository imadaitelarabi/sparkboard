import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastProvider } from "@/hooks/useToast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SparkBoard - Collaborative Whiteboard",
  description: "A collaborative whiteboard tool for project management with real-time collaboration features",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full font-sans pattern-dots`}
      >
        <ThemeProvider>
          <ToastProvider>
            <div className="min-h-full bg-gradient-to-br from-purple-50/30 via-indigo-50/20 to-pink-50/30 dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-pink-950/30">
              {children}
            </div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
