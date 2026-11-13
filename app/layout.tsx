import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "M’Vie Cake — Bakery Tycoon",
  description: "Quản lý kho, sản xuất, đơn hàng, cost và tài chính cho M’Vie Cake.",
  icons: {
    icon: "/mvie-logo.png",
    shortcut: "/mvie-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
