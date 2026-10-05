import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Аян & Қазына — 6 ноября 2026',
  description: 'Свадебное приглашение Аяна и Қазыны. Жаркент, 6 ноября 2026 года.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
