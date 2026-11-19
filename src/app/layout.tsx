import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { AppProvider } from '@/components/providers/app-provider';
import { PwaRegister } from '@/components/pwa-register';
import messages from '../../messages/ru.json';
import './globals.css';

export const metadata: Metadata = {
  title: messages.app.title,
  description: messages.app.subtitle,
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: '#0284c7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <AppProvider>
          <AppShell>{children}</AppShell>
          <PwaRegister />
        </AppProvider>
      </body>
    </html>
  );
}
