import type { Metadata } from 'next';
import type React from 'react';

export const metadata: Metadata = {
  title: 'Профиль',
  robots: { index: false, follow: false },
};

export default function PrivateSectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
