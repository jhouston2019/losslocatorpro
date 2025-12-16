import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Loss Locator Pro",
  description: "Internal Console",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        />
      </head>
      <body className="bg-sapphire-900 text-neutral-200">
        {children}
      </body>
    </html>
  );
}
