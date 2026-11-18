import type { Metadata } from 'next';
import messages from '../../messages/ru.json';
import './globals.css';

export const metadata: Metadata = {
  title: messages.app.title,
  description: messages.app.subtitle,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
