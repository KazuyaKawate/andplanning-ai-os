import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://andplanning.ai'

  return [
    {
      url: baseUrl,
      lastModified: new Date('2026-06-28'),
      changeFrequency: 'monthly',
      priority: 1,
    },
  ]
}
