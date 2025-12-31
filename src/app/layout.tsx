import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Reading Room | Community Reading Sessions in Ahmedabad",
  description:
    "Join 100 readers every Sunday for a community reading session in Ahmedabad. Register on Monday, get your spot, and share your love for books.",
  keywords: ["reading", "books", "community", "ahmedabad", "reading club", "book club"],
  authors: [{ name: "The Reading Room" }],
  openGraph: {
    title: "The Reading Room",
    description: "A community of readers gathering every Sunday in Ahmedabad",
    type: "website",
    locale: "en_IN",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
