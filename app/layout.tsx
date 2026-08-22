import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://licentia-spdx.breakbonescrew.chatgpt.site'),
  title: 'Licentia — průvodce výběrem softwarové licence',
  description: 'Prohledávejte úplná znění SPDX licencí a vyberte vhodnou licenci pro svůj software.',
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Licentia — průvodce výběrem softwarové licence',
    description: 'Prohledejte úplná znění SPDX licencí, porovnejte povinnosti a vyberte vhodnou licenci krok za krokem.',
    images: [{ url: '/og.png', width: 1733, height: 907, alt: 'Licentia — Vyberte správnou licenci pro svůj software' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Licentia — průvodce výběrem softwarové licence',
    description: 'Prohledejte SPDX licence, porovnejte povinnosti a vyberte vhodnou licenci.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
