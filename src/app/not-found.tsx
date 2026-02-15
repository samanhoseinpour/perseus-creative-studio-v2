import Link from 'next/link';

import { ImageKit, Button, TextShimmer } from './components';

export const metadata = {
  title: 'Page Not Found - Perseus Creative Studio',
  description: 'The page you are looking for does not exist.',
};

const NotFoundPage = () => {
  return (
    <main className="min-h-[80svh] flex flex-col w-full items-center justify-center">
      <Link href="/" className="flex items-center justify-center">
        <ImageKit
          src="/logo-black.png"
          alt="Website Logo"
          width={120}
          height={120}
        />
      </Link>
      <div className="flex flex-col gap-2 justify-center items-center">
        <h1 className="text-4xl leading-4xl font-semibold capitalize">
          This page does not exist
        </h1>
        <TextShimmer as="h2" className="text-sm leading-sm">
          Sorry, we couldn’t find the page you’re looking for.
        </TextShimmer>
        <Link href="/">
          <Button size="medium" className="mt-2">
            Back to Home
          </Button>
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
