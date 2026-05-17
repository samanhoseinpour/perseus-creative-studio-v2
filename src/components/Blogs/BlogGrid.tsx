import { BlogCta, BlogHeader, BlogPost, FaqsAccordion } from '@/components';
import { BLOG_INDEX_FAQS } from '@/constants/blogs';

type BlogGridProps = {
  initialCategory?: string;
  initialQuery?: string;
};

const BlogGrid = ({ initialCategory, initialQuery }: BlogGridProps) => {
  return (
    <>
      <BlogHeader />

      <BlogPost
        initialCategory={initialCategory}
        initialQuery={initialQuery}
        prioritizeFirst
      />

      <FaqsAccordion
        title="Frequently Asked Questions"
        description="What we publish, who writes it, and how to use what you read here. If your question is not covered, get in touch."
        faqs={BLOG_INDEX_FAQS}
      />

      <BlogCta />
    </>
  );
};

export default BlogGrid;
