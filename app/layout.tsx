import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Киомей строит сеть и приглашает партнеров",
  description: "Киомей строит сеть и приглашает партнеров. Бистро, точка рамена, точка суши и точка матча моти для обычных поводов встретиться и поесть.",
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
    <html lang="ru">
      <body className="antialiased">{children}</body>
    </html>
  );
}
