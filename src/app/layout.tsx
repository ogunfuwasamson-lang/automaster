import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "automaster",
  description: "agents that run your university applications: bachelor's, master's and PhD, anywhere in the world",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
