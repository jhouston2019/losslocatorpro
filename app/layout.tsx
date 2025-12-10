import "./globals.css";

export const metadata = {
  title: "Loss Locator Pro",
  description: "Internal Console",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-sapphire-900 text-neutral-200">
        {children}
      </body>
    </html>
  );
}
