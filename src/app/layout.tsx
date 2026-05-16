import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumière Beauty OS",
  description: "美甲美容行業營運 OS：預約、CRM、結帳、技師工作台、庫存與報表。"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
