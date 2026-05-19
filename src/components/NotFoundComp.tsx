import Link from 'next/link';
import { ImageKit, Button } from './';
import { Shader5 } from '@/components/shader5';

interface NotFoundCompProps {
  title?: string;
  route?: string;
  href?: string;
}

const NotFoundComp = ({ title, route, href }: NotFoundCompProps) => {
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
          width={98}
          height={120}
        />
      </Link>
      <div className="relative z-10 flex flex-col gap-2 justify-center items-center tracking-tighter">
        <h1 className="text-4xl font-semibold capitalize">
          This {title || 'This page'} does{' '}
          <span className="text-gradient">not exist !</span>
        </h1>
        <h2 className="text-sm">
          Sorry, we couldn’t find the {title || 'page'} you’re looking for.
        </h2>
        <Link href={href || '/'}>
          <Button size="medium" className="mt-4">
            Back to {route || 'Home'}
          </Button>
        </Link>
      </div>
    </main>
  );
};

export default NotFoundComp;
