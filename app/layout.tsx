import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CollabSphere: cross-house meetups",
  description: "Find nearby house peers, plan joint meetups, check in with a QR code and earn house points.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <header className="bar">
          <Link href="/" className="logo">CollabSphere</Link>
          <nav aria-label="Primary"><Link href="/">Map</Link><Link href="/propose">Propose</Link><Link href="/lead">House lead</Link><Link href="/admin">Admin</Link></nav>
        </header>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
