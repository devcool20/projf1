import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Sora } from "next/font/google";
import "./globals.css";

const headingFont = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const telemetryFont = JetBrains_Mono({
  variable: "--font-telemetry",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "projf1",
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
