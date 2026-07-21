import type { Metadata } from 'next';
import './globals.css';
import './main.css';

export const metadata: Metadata = {
  title: 'IF — 웹툰 오픈 플랫폼',
  description: '누구나 그리고, 누구나 만나는 웹툰 오픈 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
