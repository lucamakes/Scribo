import type { Metadata } from "next";
import { Hanken_Grotesk, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/context/AuthContext";
import { PostHogProvider } from "@/components/PostHogProvider/PostHogProvider";
import "./globals.css";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scripta",
  description: "Organize your creative projects",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${hankenGrotesk.variable} ${geistMono.variable}`}>
        <AuthProvider>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

