import { Metadata } from 'next';
import { BlogGrid } from '../components';

export const metadata: Metadata = {
  title: 'Blogs & Digital Marketing Insights - Perseus Creative Studio',
  description:
    'In Perseus Creative Studio blog we share our digital marketing insights, fresh case studies for you to stay one step ahead in your business growth.',
  keywords: [],

  alternates: {
    canonical: 'https://www.perseustudio.com/blogs',
  },

  openGraph: {
    title: 'Blogs & Digital Marketing Insights - Perseus Creative Studio',
    description:
      'In Perseus Creative Studio blog we share our digital marketing insights, fresh case studies for you to stay one step ahead in your business growth.',
    url: 'https://www.perseustudio.com/blogs',
    siteName: 'Perseus Creative Studio',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://ik.imagekit.io/perseus/navbar-blogs.avif',
        width: 1200,
        height: 630,
        alt: 'Perseus Creative Studio About Page Preview',
      },
    ],
  },
};

const BlogsPage = () => {
  return (
    <main>
      <BlogGrid />
    </main>
  );
};

export default BlogsPage;
