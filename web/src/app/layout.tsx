import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

const telemetryFont = JetBrains_Mono({
  variable: "--font-telemetry",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paddock OS",
  description: "Mission control inspired Formula 1 fan experience.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable} ${telemetryFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-base font-body text-on-surface">{children}</body>
    </html>
  );
}
