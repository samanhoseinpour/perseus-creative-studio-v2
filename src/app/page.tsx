import { Hero, Usps, Theme } from './components';

export default function Home() {
  return (
    <main className="flex flex-col">
      <div className="relative z-10 bg-background">
        <Hero />
        <Usps />
      </div>
      <Theme />
      <div className="h-[300vh]" />
    </main>
  );
}
