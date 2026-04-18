import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BookBrain — Document Intelligence Platform",
  description:
    "AI-powered book discovery and Q&A platform. Explore books, get AI-generated summaries, genre classifications, and ask intelligent questions via RAG.",
  keywords: "books, AI, RAG, document intelligence, book recommendations, question answering",
  openGraph: {
    title: "BookBrain — Document Intelligence Platform",
    description: "AI-powered book discovery and Q&A",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="relative min-h-screen">
        {/* Ambient background glow */}
        <div className="ambient-bg" aria-hidden="true" />

        {/* Content layer */}
        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
