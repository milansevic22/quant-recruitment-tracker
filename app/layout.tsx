import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quant Recruitment Tracker",
  description:
    "Internal MVP dashboard for tracking quant recruitment roles across public careers pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
