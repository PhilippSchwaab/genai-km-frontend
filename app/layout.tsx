import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HITL Verification",
  description: "Human-in-the-loop wiki draft verification instrument"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
