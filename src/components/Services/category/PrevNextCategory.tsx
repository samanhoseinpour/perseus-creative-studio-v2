import PrevNextNav from '@/components/PrevNextNav';
import { CATEGORIES } from '@/constants/services';

interface PrevNextCategoryProps {
  currentSlug: string;
}

/**
 * Sequential pager across service categories (wraps around). Thin data wrapper
 * around the shared <PrevNextNav> — same markup the blog post pager uses.
 */
const PrevNextCategory = ({ currentSlug }: PrevNextCategoryProps) => {
  const cats = Object.values(CATEGORIES);
  const idx = cats.findIndex((c) => c.slug === currentSlug);
  if (idx === -1 || cats.length < 2) return null;

  const prev = cats[(idx - 1 + cats.length) % cats.length];
  const next = cats[(idx + 1) % cats.length];

  return (
    <PrevNextNav
      ariaLabel="Service categories"
      className="pb-16 sm:pb-24"
      prev={{
        href: `/services/${prev.slug}`,
        title: prev.title,
        eyebrow: 'Previous',
      }}
      next={{
        href: `/services/${next.slug}`,
        title: next.title,
        eyebrow: 'Next',
      }}
    />
  );
};

export default PrevNextCategory;
