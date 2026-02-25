import Link from 'next/link';

import { ImageKit, Button, TextShimmer } from './components';
import { Shader5 } from '@/components/shader5';

export const metadata = {
  title: 'Page Not Found - Perseus Creative Studio',
  description: 'The page you are looking for does not exist.',
};

const NotFoundPage = () => {
  return (
    <main className="relative min-h-svh flex flex-col w-full items-center justify-center overflow-hidden">
      {/* Background shader */}
      <div className="absolute inset-0 -z-10">
        <Shader5 />
      </div>

      <Link href="/" className="flex items-center justify-center">
        <ImageKit
          src="/logo-black.png"
          alt="Website Logo"
          width={120}
          height={120}
        />
      </Link>
      <div className="relative z-10 flex flex-col gap-2 justify-center items-center tracking-tighter">
        <h1 className="text-4xl font-semibold capitalize">
          This page does <span className="text-gradient">not exist !</span>
        </h1>
        <TextShimmer as="h2" className="text-sm">
          Sorry, we couldn’t find the page you’re looking for.
        </TextShimmer>
        <Link href="/">
          <Button size="medium" className="mt-4">
            Back to Home
          </Button>
        </Link>
      </div>
    </main>
  );
};

export default NotFoundPage;
