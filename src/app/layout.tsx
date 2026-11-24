import type { Metadata, Viewport } from 'next';
import { AppShell } from '@/components/app-shell';
import { AppProvider } from '@/components/providers/app-provider';
import { PwaRegister } from '@/components/pwa-register';
import { getSiteUrl, SITE_NAME, SITE_TAGLINE_RU } from '@/lib/seo/site';
import messages from '../../messages/ru.json';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: `${messages.app.title} — ${SITE_TAGLINE_RU}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: messages.app.subtitle,
  manifest: '/manifest.webmanifest',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE_RU}`,
    description: messages.app.subtitle,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE_RU}`,
    description: messages.app.subtitle,
  },
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
