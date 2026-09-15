import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Divya Pooja — Coming Soon",
  description: "Telugu Pooja guidance for your family, wherever home may be. Join the launch list.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
