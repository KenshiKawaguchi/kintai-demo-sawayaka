import type { Metadata } from "next";
import { Geist, Geist_Mono, Roboto, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-clock",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-popup-time",
  subsets: ["latin"],
  weight: ["500"],
});

export const metadata: Metadata = {
  title: "勤怠管理デモ",
  description: "レスポンシブ対応の勤怠打刻画面",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} ${roboto.variable} ${robotoCondensed.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
