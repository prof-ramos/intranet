import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const googleSans = localFont({
  variable: '--font-google-sans',
  display: 'swap',
  src: [
    {
      path: './fonts/google-sans/GoogleSans-Variable.ttf',
      style: 'normal',
      weight: '400 700',
    },
    {
      path: './fonts/google-sans/GoogleSans-Italic-Variable.ttf',
      style: 'italic',
      weight: '400 700',
    },
  ],
});

const playfair = localFont({
  variable: '--font-playfair',
  display: 'swap',
  src: [
    {
      path: './fonts/playfair/Playfair-Variable.ttf',
      style: 'normal',
      weight: '400 900',
    },
    {
      path: './fonts/playfair/Playfair-Italic-Variable.ttf',
      style: 'italic',
      weight: '400 900',
    },
  ],
});

export const metadata: Metadata = {
  title: 'ASOF Intranet - Admin',
  description: 'Intranet Admin Page for ASOF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${googleSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
