import type { Metadata } from "next";
import { JetBrains_Mono, Manrope, Syne } from "next/font/google";
import "./globals.css";
import { AppLayout } from "@/components/layout/app-layout";

const headingFont = Syne({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const bodyFont = Manrope({
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
      <body className="min-h-full bg-base font-body text-on-surface">
        <AppLayout>{children}</AppLayout>
      </body>
    </html>
  );
}
