import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/tr', '/en', '/tr/units/', '/en/units/', '/about', '/privacy', '/welcome'],
        disallow: ['/profile', '/settings', '/auth', '/review', '/offline'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
