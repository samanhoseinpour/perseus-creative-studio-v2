import type { Metadata } from 'next';
import { Navbar, Footer, NotFoundComp } from '@/components';

export const metadata: Metadata = {
  title: 'Page Not Found - Perseus Creative Studio',
  description: 'The page you are looking for does not exist.',
};

// The global 404 (unmatched URLs) renders inside the *root* layout, which is a
// bare document shell — the marketing chrome lives in the `(marketing)` group
// layout and isn't inherited here. Render Navbar/Footer directly so a missing
// page still looks like the site. (These degrade to native scroll without the
// Lenis provider, so no SmartLenis wrapper is needed.)
const NotFoundPage = () => {
  return (
    <>
      <Navbar />
      <NotFoundComp title="page" route="Home" />
      <Footer />
    </>
  );
};

export default NotFoundPage;
