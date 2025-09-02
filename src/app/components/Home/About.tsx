import { Container, Button, ImageKit, TextEffect, AnimatedGroup } from "../";

const About = () => (
  <section className="mb-16">
    <Container>
      <div className="flex flex-row items-center justify-between">
        <h3 className="text-3xl leading-3xl text-black/30 dark:text-white/30">
          <TextEffect
            as="span"
            className="font-extrabold text-5xl leading-5xl tracking-tighter text-black dark:text-white"
          >
            PERSEUS
          </TextEffect>{" "}
          <TextEffect as="span">Whats All About</TextEffect>
        </h3>
        <Button size="medium">Learn More About Perseus</Button>
      </div>
      <div className="mt-10 grid gap-4 sm:mt-16 lg:grid-cols-2 lg:grid-rows-2">
        <AnimatedGroup className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-br from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
              <TextEffect
                as="h4"
                className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center"
              >
                Who We Are
              </TextEffect>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </TextEffect>
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </TextEffect>
              </p>
            </div>
            <div className="@container relative min-h-[30rem] w-full grow max-lg:mx-auto max-lg:max-w-sm">
              <div className="absolute inset-x-0 top-10 bottom-0 overflow-hidden ">
                <ImageKit
                  src="navbar-home.jpg"
                  alt=""
                  className="object-cover"
                  fill
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 lg:rounded-l-[2rem]"></div>
        </AnimatedGroup>

        <AnimatedGroup className="relative max-lg:row-start-1">
          <div className="absolute inset-px rounded-lg bg-[url('https://ik.imagekit.io/perseus/services-videography.jpg')] bg-cover opacity-30 max-lg:rounded-t-[2rem]" />
          <div className="relative flex h-full flex-col overflow-hidden max-lg:rounded-t-[calc(2rem+1px)]">
            <div className="px-8 pt-8 sm:px-10 sm:pt-10">
              <TextEffect
                as="h4"
                className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center"
              >
                Who We Are 2
              </TextEffect>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </TextEffect>
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </TextEffect>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-t-[2rem]"></div>
        </AnimatedGroup>

        <AnimatedGroup className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tl from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />

          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="px-8 pt-8 sm:px-10 sm:pt-10">
              <TextEffect
                as="h4"
                className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center"
              >
                Who We Are 3
              </TextEffect>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </TextEffect>
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </TextEffect>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5"></div>
        </AnimatedGroup>

        <AnimatedGroup className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tl from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-10">
              <TextEffect
                as="h4"
                className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center"
              >
                Who We Are 4
              </TextEffect>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </TextEffect>
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </TextEffect>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]"></div>
        </AnimatedGroup>
        <AnimatedGroup className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tr from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-10">
              <TextEffect
                as="h4"
                className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center"
              >
                Who We Are 5
              </TextEffect>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </TextEffect>
                <TextEffect as="span" per="line" delay={0.5}>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </TextEffect>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]" />
        </AnimatedGroup>
      </div>
    </Container>
  </section>
);

export default About;
