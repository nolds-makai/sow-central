import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOW Central",
  description: "Upload Statements of Work, extract structured deliverables, track engagement progress.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
