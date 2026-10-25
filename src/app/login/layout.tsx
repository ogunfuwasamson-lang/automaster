import type { Metadata } from "next";

// the sign-in page is a client component, so its title and search settings live here
export const metadata: Metadata = { title: "Sign in or create an account", robots: { index: false, follow: true } };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
