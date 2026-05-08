import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const googleSans = localFont({
  variable: '--font-google-sans',
  display: 'swap',
  src: [
    {
      path: './fonts/google-sans/GoogleSans-Variable.woff2',
      style: 'normal',
      weight: '400 700',
    },
  ],
});

const playfair = localFont({
  variable: '--font-playfair',
  display: 'swap',
  src: [
    {
      path: './fonts/playfair/Playfair-Variable.woff2',
      style: 'normal',
      weight: '600 700',
    },
  ],
});

export const viewport: Viewport = {
  themeColor: '#040920',
};

export const metadata: Metadata = {
  title: 'ASOF Intranet',
  description: 'Sistema de gestão interna da Associação de Oficiais de Chancelaria',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      data-theme="ASOF"
      className={`${googleSans.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-content"
        >
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
