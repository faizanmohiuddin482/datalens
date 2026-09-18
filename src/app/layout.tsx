import type { Metadata } from "next";
import { IBM_Plex_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

/** Mono carries the entire UI; the serif italic appears once per view, as a hero line. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DataLens — ask your spreadsheets",
  description:
    "Upload CSV or Excel files and ask analytical questions in plain English. Queries run on SQLite in your browser; your data never leaves the tab.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plexMono.variable} ${playfair.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
