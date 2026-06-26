import Link from 'next/link';
import { LuArrowLeft as ArrowLeft } from 'react-icons/lu';
import { Img, Button, ThemedShader } from './';
import { PERSEUS_LOGO } from '@/constants';

interface NotFoundCompProps {
  title?: string;
  route?: string;
  href?: string;
}

const NotFoundComp = ({ title, route, href }: NotFoundCompProps) => {
  return (
    <main className="relative min-h-svh flex flex-col w-full items-center justify-center overflow-hidden">
      {/* Background shader — bright in light mode, dark in dark mode. */}
      <div className="absolute inset-0 -z-10">
        <ThemedShader />
      </div>

      <Link href="/" className="flex items-center justify-center">
        <Img
          src={PERSEUS_LOGO}
          alt="Website Logo"
          width={98}
          height={120}
          className="dark:invert"
        />
      </Link>
      <div className="relative z-10 flex flex-col gap-2 justify-center items-center tracking-tighter">
        <h1 className="text-4xl font-semibold capitalize text-black">
          This {title || 'This page'} does{' '}
          <span className="text-black/40">not exist !</span>
        </h1>
        <h2 className="text-sm text-black/60">
          Sorry, we couldn’t find the {title || 'page'} you’re looking for.
        </h2>
        <Link href={href || '/'}>
          <Button size="medium" icon={ArrowLeft} iconPosition="left" className="mt-4">
            Back to {route || 'Home'}
          </Button>
        </Link>
      </div>
    </main>
  );
};

export default NotFoundComp;
