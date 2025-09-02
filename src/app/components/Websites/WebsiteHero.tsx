import React from "react";

import Link from "next/link";
import { ArrowRight, Brain } from "lucide-react";
import {
  AnimatedGroup,
  TextEffect,
  Button,
  Container,
  ImageComparison,
} from "../";

const WebsiteHero = () => {
  return (
    <section className="h-[100svh] flex-col items-center justify-center pt-48">
      <Container>
        <AnimatedGroup>
          <Link
            href="/assistant"
            className="group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300"
          >
            <TextEffect as="span" className="text-sm">
              Let Our AI Assistant Consult You.
            </TextEffect>
            <span className="block h-4 w-0.5 border-l bg-white/30"></span>

            <div className="group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
              <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                <span className="flex size-6">
                  <ArrowRight className="m-auto size-3" />
                </span>
                <span className="flex size-6">
                  <Brain className="m-auto size-3" />
                </span>
              </div>
            </div>
          </Link>
        </AnimatedGroup>

        <TextEffect
          as="h1"
          className="mx-auto mt-8 text-4xl sm:text-5xl lg:mt-16 max-w-5xl"
        >
          High-Performance Websites, Built for Growth
        </TextEffect>
        <TextEffect
          per="line"
          delay={0.5}
          as="p"
          className="mx-auto mt-8 max-w-2xl text-md leading-md"
        >
          Strategy, design, and Next.js development to ship fast, scalable
          websites that convert and are effortless to maintain.
        </TextEffect>

        <AnimatedGroup className="mt-12 flex flex-col items-center justify-center gap-2 md:flex-row">
          <div key={1}>
            <Button size="medium">
              <Link href="/contact">Build Your Website</Link>
            </Button>
          </div>
          <Button key={2} size="medium">
            <Link href="/contact">Request a consultation</Link>
          </Button>
        </AnimatedGroup>
      </Container>
      <div className="h-[60vh] px-1 md:px-8 flex items-center justify-center [perspective:800px] [transform-style:preserve-3d]">
        <div className="p-1 md:p-4 rounded-lg mx-auto w-full h-3/4 rotate-x-[15deg] translate-z-[80px]">
          <ImageComparison
            firstImage="https://ik.imagekit.io/perseus/imageComparison-website-1.png"
            secondImage="https://ik.imagekit.io/perseus/imageComparison-website-2.png"
            firstImageAlt="The Code behind a Perseus Creative Studio Website"
            secondImageAlt="A Perseus Creative Studio Website"
            firstImageClassName="object-cover object-center w-full"
            secondImageClassname="object-cover object-center w-full"
            className="w-full h-full rounded-lg"
            slideMode="hover"
            autoplay={true}
          />
        </div>
      </div>
    </section>
  );
};

export default WebsiteHero;
