import { ImageKit, TextShimmer } from "../";

import {
  Layers,
  Palette,
  Zap,
  MessageCircle,
  Rocket,
  Users,
} from "lucide-react";

const ServicesFeatures = () => {
  return (
    <section className="py-16 sm:py-32 bg-white">
      <div className="container mx-auto space-y-12 px-6 py-8 sm:py-16 lg:space-y-20">
        {/* Block 1 — Fast Charging */}
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 xl:gap-16">
          <div className="text-black sm:text-lg">
            <h3 className="mb-4 text-2xl leading-2xl font-semibold ">
              Brand Systems That Scale With You
            </h3>

            <p className="mb-8 text-sm leading-sm">
              Perseus Creative Studio builds cohesive brand and product systems
              for teams that are shipping fast. We translate your story into
              design that works across product, marketing, and sales.
            </p>

            <ul className="my-7 space-y-5 border-t border-gray-300 pt-8">
              <li className="flex space-x-3">
                <Layers className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold">
                    End-to-end brand systems
                  </span>{" "}
                  from logo and typography to component libraries and usage
                  guidelines.
                </span>
              </li>

              <li className="flex space-x-3">
                <Palette className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  Product-aligned visual language that feels{" "}
                  <span className="font-semibold">
                    consistent across product, web, and decks
                  </span>
                  .
                </span>
              </li>

              <li className="flex space-x-3">
                <Zap className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  Flexible design systems that your internal team can own,
                  extend, and ship with quickly.
                </span>
              </li>
            </ul>

            <TextShimmer className="mb-8 text-black/70 text-sm leading-sm font-semibold">
              Result: a brand that feels sharp, familiar, and reliable—no matter
              where your customers meet you.
            </TextShimmer>
          </div>

          <div>
            <ImageKit
              alt="EV fast-charging site with heavy-duty bays"
              src="/homeServices-1.JPG"
              width={600}
              height={400}
              className="mb-4 hidden w-full rounded-lg lg:mb-0 lg:flex"
            />
            <div aria-hidden="true" className="relative">
              <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-white pt-[15%]" />
            </div>
          </div>
        </div>

        {/* Block 2 — Solar-Powered Clean Energy */}
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 xl:gap-16">
          <div>
            <ImageKit
              alt="Utility-scale solar powering EV charging infrastructure"
              src="/homeServices-2.JPG"
              width={600}
              height={400}
              className="mb-4 hidden w-full rounded-lg lg:mb-0 lg:flex"
            />
            <div aria-hidden="true" className="relative">
              <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-white pt-[15%]" />
            </div>
          </div>

          <div className="text-black sm:text-lg">
            <h3 className="mb-4 text-2xl leading-2xl font-semibold ">
              Content & Campaigns That Drive Demand
            </h3>

            <p className="mb-8 text-sm leading-sm">
              We plan, produce, and ship content that keeps your brand visible:
              launch films, photo sets, landing pages, and social campaigns
              built around clear messaging and measurable outcomes.
            </p>

            <ul className="my-7 space-y-5 border-t border-gray-300 pt-8">
              <li className="flex space-x-3">
                <MessageCircle className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold">
                    Messaging & content strategy
                  </span>{" "}
                  that aligns video, photo, web, and social into one clear
                  story.
                </span>
              </li>

              <li className="flex space-x-3">
                <Rocket className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold">Launch-ready campaigns</span>{" "}
                  for product drops, openings, and announcements across all
                  channels.
                </span>
              </li>

              <li className="flex space-x-3">
                <Users className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  Ongoing content support so your internal team isn&apos;t stuck
                  chasing assets every time you need to post or launch.
                </span>
              </li>
            </ul>

            <TextShimmer className="mb-8 text-black/70 text-sm leading-sm font-semibold">
              Result: a content engine that stays on-brand, on-schedule, and
              actually moves the numbers.
            </TextShimmer>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServicesFeatures;
