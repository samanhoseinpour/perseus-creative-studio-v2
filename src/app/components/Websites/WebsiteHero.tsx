import React from "react";
import Link from "next/link";
import { ArrowRight, BrainCircuit } from "lucide-react";

import {
  Button,
  TextEffect,
  AnimatedGroup,
  LogoCloud,
  ImageKit,
  BorderBeam,
} from "../";
import { websiteCustomerLogos } from "@/app/constants/website";

export default function HeroSection() {
  return (
    <>
      <section className="overflow-hidden">
        <div className="relative pt-24 md:pt-36">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
              <AnimatedGroup>
                <Link
                  href="/assistant"
                  className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
                >
                  <span className="text-foreground text-sm">
                    Let Our AI Assistant Help You.
                  </span>
                  <span className="dark:border-background block h-4 w-0.3 border-l bg-white dark:bg-zinc-700"></span>

                  <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                    <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                      <span className="flex size-6">
                        <ArrowRight className="m-auto size-3" />
                      </span>
                      <span className="flex size-6">
                        <BrainCircuit className="m-auto size-3" />
                      </span>
                    </div>
                  </div>
                </Link>
              </AnimatedGroup>

              <TextEffect
                preset="fade-in-blur"
                speedSegment={0.3}
                as="h1"
                className="mx-auto mt-8 max-w-5xl text-4xl sm:text-5xl lg:mt-16"
              >
                Modern Solutions for Customer Engagement
              </TextEffect>
              <TextEffect
                per="line"
                preset="fade-in-blur"
                speedSegment={0.3}
                delay={0.5}
                as="p"
                className="mx-auto mt-8 max-w-2xl text-md"
              >
                Highly customizable components for building modern websites and
                applications that look and feel the way you mean it.
              </TextEffect>

              <AnimatedGroup className="mt-12 flex flex-col items-center justify-center gap-6 md:flex-row">
                <Link href="/contact" key={1}>
                  <Button size="medium">
                    <span className="text-nowrap">Start Building</span>
                  </Button>
                </Link>

                <Link href="/contact">
                  <Button key={2} size="medium">
                    <span className="text-nowrap">Request a demo</span>
                  </Button>
                </Link>
              </AnimatedGroup>
            </div>
          </div>

          <AnimatedGroup>
            <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
              <div className="inset-shadow-2xs bg-background relative mx-auto max-w-6xl overflow-hidden rounded-lg shadow-lg shadow-zinc-950/15">
                <div
                  aria-hidden
                  className="bg-linear-to-b to-background absolute inset-0 z-10 from-transparent from-35%"
                />
                <ImageKit
                  className="bg-background aspect-15/8 relative rounded-lg"
                  src="/website-hero.webp"
                  alt="code snippet"
                  width="2700"
                  height="1440"
                />
                <BorderBeam
                  duration={12}
                  size={200}
                  className="from-transparent via-blue-700 to-transparent"
                />
              </div>
            </div>
          </AnimatedGroup>
        </div>
      </section>
      <LogoCloud
        slogan="Empowering the Future of Work"
        logos={websiteCustomerLogos}
      />
    </>
  );
}
