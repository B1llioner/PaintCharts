import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Инструмент для рисования зон торговли',
  description: 'Веб-приложение для анализа финансовых графиков с возможностью разметки зон торговли через горячие клавиши',
  keywords: ['trading', 'charts', 'zones', 'analysis', 'cryptocurrency', 'coinglass'],
  authors: [{ name: 'Trading Tools' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
