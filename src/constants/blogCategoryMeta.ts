/**
 * Per-category SEO copy seeded into blog_categories.seo_title /
 * seo_description by scripts/import-blogs.mts. The hub reads the DATABASE;
 * this file is the importer's source and is deleted with the registry at the
 * close of step 2. `branding` has no entry on purpose: it has no posts, and a
 * stub description is penalised like a duplicate.
 */
export const BLOG_CATEGORY_META: Record<string, { title: string; description: string }> = {
  'digital-marketing': {
    title: 'Digital Marketing Articles for Vancouver Businesses | Perseus',
    description:
      'SEO, paid ads, content, social, and growth strategy guides for Vancouver businesses. Practical playbooks from the Perseus team’s client work.',
  },
  production: {
    // Keep base titles ≤61 chars: pagination appends " (Page N)" (9 chars)
    // and Semrush flags titles over 70.
    title: 'Video, Photo & Aerial Production for Vancouver | Perseus',
    description:
      'Videography, photography, drone, and visual storytelling guides for Vancouver brands: production, gear, and post-production lessons from the Perseus team.',
  },
  websites: {
    title: 'Websites: Design, Development & UX Articles | Perseus Studio',
    description:
      'Website design, development, UX, and conversion strategy articles for Vancouver businesses: what makes a site fast, credible, and revenue-driving.',
  },
  social: {
    title: 'Social Media Marketing Articles for Vancouver | Perseus',
    description:
      'Social media marketing guides for Vancouver brands: Instagram, Reels, content ideas, and audience-growth tactics from the Perseus team’s client work.',
  },
};
