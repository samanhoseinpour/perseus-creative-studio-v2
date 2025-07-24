import { Container, Button, ImageKit } from "../";

const About = () => (
  <section className="mb-24">
    <Container>
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-3xl leading-3xl text-black/30 dark:text-white/30">
          <span className="font-extrabold text-5xl leading-5xl tracking-tighter text-black dark:text-white">
            PERSEUS
          </span>{" "}
          Whats All About
        </h2>
        <Button size="medium" className="border-black dark:hover:border-white">
          Learn More About Perseus
        </Button>
      </div>
      <div className="mt-10 grid gap-4 sm:mt-16 lg:grid-cols-2 lg:grid-rows-2">
        <div className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-br from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
              <h4 className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are
              </h4>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <span>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </span>
                <span>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </span>
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
        </div>

        <div className="relative max-lg:row-start-1">
          <div className="absolute inset-px rounded-lg bg-[url('https://ik.imagekit.io/perseus/services-videography.jpg')] bg-cover opacity-30 max-lg:rounded-t-[2rem]" />
          <div className="relative flex h-full flex-col overflow-hidden max-lg:rounded-t-[calc(2rem+1px)]">
            <div className="px-8 pt-8 sm:px-10 sm:pt-10">
              <h4 className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 2
              </h4>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <span>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </span>
                <span>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </span>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-t-[2rem]"></div>
        </div>

        <div className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tl from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />

          <div className="relative flex h-full flex-col overflow-hidden">
            <div className="px-8 pt-8 sm:px-10 sm:pt-10">
              <p className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 3
              </p>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <span>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </span>
                <span>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </span>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5"></div>
        </div>

        <div className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tl from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-10">
              <p className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 4
              </p>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <span>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </span>
                <span>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </span>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]"></div>
        </div>
        <div className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tr from-white/30 to-white/0 dark:from-white/5 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-10">
              <p className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 5
              </p>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold flex flex-col gap-2">
                <span>
                  Lorem ipsum dolor sit amet consectetur adipisicing elit.
                  Incidunt velit veniam ipsa doloremque possimus iste fugiat quo
                  quidem minima odit corrupti qui nihil, non necessitatibus
                  saepe iure provident molestiae laudantium?
                </span>
                <span>
                  Lorem ipsum dolor sit amet consectetur, adipisicing elit.
                  Consequatur ea aperiam eos minus voluptatibus aliquam quaerat
                  at fuga sit necessitatibus, est fugit dicta quibusdam pariatur
                  error nam suscipit laudantium ex?
                </span>
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]"></div>
        </div>
      </div>
    </Container>
  </section>
);

export default About;
