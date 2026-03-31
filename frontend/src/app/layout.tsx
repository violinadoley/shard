import type { Metadata } from "next";
import './globals.css';

export const metadata: Metadata = {
  title: 'Shard - Dead Man\'s Switch Wallet Recovery',
  description: 'Self-custodial inheritance system on Flow blockchain',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}