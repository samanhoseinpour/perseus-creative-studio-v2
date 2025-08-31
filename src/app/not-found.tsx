import Link from "next/link";

import { Container, ImageKit, Button, Beam } from "./components";

export const metadata = {
  title: "Page Not Found - Perseus Creative Studio",
  description: "The page you are looking for does not exist.",
};

const NotFoundPage = () => {
  return (
    <main className="h-[100svh] flex justify-center items-center">
      <div aria-hidden className="absolute inset-0 -z-10 pointer-events-none">
        <Beam
          beamWidth={1}
          beamHeight={30}
          beamNumber={24}
          lightColor="#fcfcfc"
          speed={3}
          noiseIntensity={1.75}
          scale={0.2}
          rotation={48}
        />
      </div>
      <Container className="flex flex-col justify-center items-center">
        <Link href="/" className="flex items-center justify-center -mb-32">
          <ImageKit
            src="/logo-white.png"
            alt="Website Logo"
            width={320}
            height={320}
            loading="lazy"
          />
        </Link>
        <h1 className="text-5xl leading-5xl font-semibold capitalize">
          This page does not exist
        </h1>
        <p className="mt-6 text-lg font-medium  sm:text-xl/8">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <Link href="/">
          <Button size="medium" className="mt-6">
            Back to Home
          </Button>
        </Link>
      </Container>
    </main>
  );
};

export default NotFoundPage;
