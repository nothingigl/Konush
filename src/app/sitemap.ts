import type { MetadataRoute } from 'next';
import { getAllUnitsForCourse } from '@/lib/content/loader';
import { absoluteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: absoluteUrl('/tr'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/en'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: absoluteUrl('/welcome'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: absoluteUrl('/about'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: absoluteUrl('/privacy'),
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  for (const courseId of ['tr', 'en'] as const) {
    const units = getAllUnitsForCourse(courseId);
    for (const unit of units) {
      entries.push({
        url: absoluteUrl(`/${courseId}/units/${unit.slug}`),
        lastModified: now,
        changeFrequency: 'monthly',
        priority: unit.boss ? 0.8 : 0.7,
      });
    }
  }

  return entries;
}
