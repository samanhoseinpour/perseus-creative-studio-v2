import { Container, Button, ImageKit } from '../';

const About = () => (
  <section className="mb-8">
    <Container className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
      <div className="flex flex-row items-center justify-between">
        <h2 className="text-3xl leading-3xl text-black dark:text-white">
          <span className="font-extrabold text-5xl leading-5xl tracking-tighter pr-2">
            PERSEUS
          </span>{' '}
          Whats All About
        </h2>
        <Button size="medium" className="border-black dark:hover:border-white ">
          CTA for about us
        </Button>
      </div>
      <div className="mt-10 grid gap-4 sm:mt-16 lg:grid-cols-2 lg:grid-rows-2">
        <div className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg dark:bg-background-contrast bg-background-contrast-white lg:rounded-l-[2rem]" />
          <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] lg:rounded-l-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-0">
              <h4 className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are
              </h4>
              <p className="mt-2 max-w-lg text-sm leading-sm text-black/30 dark:text-white/30 max-lg:text-center font-semibold">
                Lorem ipsum dolor sit, amet consectetur adipisicing elit.
                Temporibus, iusto suscipit. Nobis eaque beatae laudantium
                excepturi libero rem consequatur repudiandae quaerat
                voluptatibus corporis ipsam, animi saepe reiciendis nam dolorum
                suscipit. Lorem ipsum dolor sit amet consectetur adipisicing
                elit. Vitae, eos delectus. Nihil, eveniet ullam exercitationem
                omnis eum dolore minima quos fuga nam recusandae. Earum nesciunt
                et, ab aspernatur inventore asperiores!
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
          <div className="absolute inset-px rounded-lg dark:bg-background-contrast bg-background-contrast-white max-lg:rounded-t-[2rem]"></div>
          <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-t-[calc(2rem+1px)]">
            <div className="px-8 pt-8 sm:px-10 sm:pt-10">
              <h4 className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 2
              </h4>
              <p className="mt-2 max-w-lg text-sm leading-sm max-lg:text-center">
                Lorem ipsum, dolor sit amet consectetur adipisicing elit maiores
                impedit. Lorem ipsum dolor sit amet, consectetur adipisicing
                elit. Quos accusamus veritatis dolorum repellendus earum
                pariatur id repellat eligendi? Voluptate exercitationem sapiente
                adipisci culpa error similique maxime quidem pariatur
                perspiciatis eligendi.
              </p>
            </div>
            <div className="flex flex-1 items-center justify-center px-8 max-lg:pt-10 max-lg:pb-12 sm:px-10 lg:pb-2">
              <ImageKit
                src="navbar-home.jpg"
                alt=""
                loading="lazy"
                fill
                className="object-cover bg-background opacity-20"
              />
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-t-[2rem]"></div>
        </div>

        <div className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-br from-white/30 to-white/0 dark:from-white/10 dark:to-white/0" />

          <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)]">
            <div className="px-8 pt-8 sm:px-10 sm:pt-10">
              <p className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 3
              </p>
              <p className="mt-2 max-w-lg text-sm leading-sm text-white/30 max-lg:text-center">
                Morbi viverra dui mi arcu sed. Tellus semper adipiscing
                suspendisse semper morbi.
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5"></div>
        </div>

        <div className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tl from-white/30 to-white/0 dark:from-white/10 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-10">
              <p className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 4
              </p>
              <p className="mt-2 max-w-lg text-sm leading-sm dark:text-white/30 max-lg:text-center">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Explicabo consequatur sapiente provident facilis, voluptatibus
                animi at deleniti magnam praesentium minus porro libero amet.
                Cum, amet distinctio doloribus voluptatibus velit ratione? Lorem
                ipsum dolor sit amet consectetur, adipisicing elit. Voluptas
                accusamus assumenda laboriosam. Quos dolores omnis ratione
                commodi odit nemo voluptatum asperiores, perspiciatis, quas
                molestiae nisi placeat distinctio, tempora doloribus quaerat?
              </p>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-lg ring-1 shadow-sm ring-black/5 max-lg:rounded-b-[2rem] lg:rounded-r-[2rem]"></div>
        </div>
        <div className="relative lg:row-span-2">
          <div className="absolute inset-px rounded-lg bg-gradient-to-tr from-white/30 to-white/0 dark:from-white/10 dark:to-white/0" />
          <div className="relative flex h-full flex-col overflow-hidden rounded-[calc(var(--radius-lg)+1px)] max-lg:rounded-b-[calc(2rem+1px)] lg:rounded-r-[calc(2rem+1px)]">
            <div className="px-8 pt-8 pb-3 sm:px-10 sm:pt-10 sm:pb-10">
              <p className="mt-2 text-3xl leading-3xl text-black dark:text-white font-semibold max-lg:text-center">
                Who We Are 5
              </p>
              <p className="mt-2 max-w-lg text-sm leading-sm dark:text-white/30 max-lg:text-center">
                Lorem ipsum dolor sit amet consectetur adipisicing elit.
                Explicabo consequatur sapiente provident facilis, voluptatibus
                animi at deleniti magnam praesentium minus porro libero amet.
                Cum, amet distinctio doloribus voluptatibus velit ratione? Lorem
                ipsum dolor sit amet consectetur, adipisicing elit. Voluptas
                accusamus assumenda laboriosam. Quos dolores omnis ratione
                commodi odit nemo voluptatum asperiores, perspiciatis, quas
                molestiae nisi placeat distinctio, tempora doloribus quaerat?
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
