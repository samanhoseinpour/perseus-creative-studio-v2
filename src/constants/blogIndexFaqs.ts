// FAQ pairs surfaced at the bottom of the /blogs hub. Kept in sync with the
// FAQPage node in src/app/(marketing)/blogs/page.tsx so the JSON-LD matches
// what users see (a divergence would invalidate the rich-result eligibility).
// Hub copy, not post content, so it lives in its own registry-free module:
// the hub and BlogGrid read it from here and no longer import
// src/constants/blogs.ts (whose own copy stays until the registry is retired).
export const BLOG_INDEX_FAQS: { question: string; answer: string }[] = [
  {
    question: 'How often does Perseus Creative Studio publish new articles?',
    answer:
      'We publish new articles roughly every one to two weeks. The exact cadence depends on what we are learning from active client work. We would rather ship one well-researched piece than churn out filler.',
  },
  {
    question: 'Are these articles only relevant to Vancouver businesses?',
    answer:
      'Most of our case studies and examples are based on Vancouver, BC work, but the underlying strategy and tactics travel. We have clients in Toronto, Los Angeles, and beyond who apply the same playbook. When a topic is strictly local (for example MLS-specific real estate guidance), we say so up front.',
  },
  {
    question: 'Who writes the Perseus blog?',
    answer:
      'Articles are written or reviewed by the Perseus team, primarily founder Aryan Ghasemi and COO Arshia Farrahi, with contributions from co-founder and CTO Saman Hoseinpour and our in-house designers, marketers, and producers. Every piece is informed by work we have shipped, not pure theory.',
  },
  {
    question: 'Can I quote or republish a Perseus article?',
    answer:
      'Short quotes and excerpts with a link back are welcome. For full republishes or syndication, email us at info@perseustudio.com. We usually say yes for fitting partners.',
  },
  {
    question: 'How do you choose what to write about?',
    answer:
      'We write about questions clients actually ask us, and about findings from our own measurement and campaigns. If there is a topic you would like us to cover, get in touch via our contact page.',
  },
  {
    question: 'Do you cover paid advertising and SEO topics?',
    answer:
      'Yes, under the Digital Marketing category. We share what we are testing across Google Ads, Meta Ads, LinkedIn Ads, local SEO, and content. Real-world results, not generic best-practice rehashes.',
  },
];
