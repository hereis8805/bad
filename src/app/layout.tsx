import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "배드민턴 클럽",
  description: "배드민턴 클럽 경기 기록",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full bg-gray-50 flex flex-col">
        <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
