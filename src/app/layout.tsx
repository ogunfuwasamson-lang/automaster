import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "automaster",
  description: "agents that run your US masters applications",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
