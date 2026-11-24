import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Вход и регистрация',
  robots: { index: false, follow: false },
};

export default function PrivateSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
