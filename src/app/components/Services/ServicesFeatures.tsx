import Link from "next/link";
import { Button, ImageKit, Container } from "../";

import {
  Building2,
  Hammer,
  Wrench,
  Truck,
  Dumbbell,
  Users,
  Sparkles,
  Calendar,
} from "lucide-react";

const ServicesFeatures = () => {
  return (
    <section className="section-padding bg-white">
      <Container className="space-y-12 lg:space-y-20">
        <div className="lg:grid lg:grid-cols-2 lg:items-center lg:gap-8 xl:gap-16">
          <div className="text-black sm:text-lg">
            <h3 className="mb-1 text-2xl leading-2xl font-semibold">
              Construction, Real Estate & Development
            </h3>

            <p className="mb-8 text-sm leading-sm">
              We support projects at every stage with visual content, marketing,
              and digital presence.
            </p>

            <ul className="my-7 space-y-5 border-t border-gray-300 pt-8">
              <li className="flex space-x-3">
                <Building2 className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Real Estate Agents & Firms
                  </span>{" "}
                  We provide full media support for real estate professionals,
                  including photography, video, websites, 2D and 3D floor plans,
                  and 360° tours. Our work helps listings stand out while
                  supporting consistent branding across platforms. We also
                  collaborate with trades involved in property preparation and
                  presentation.
                </span>
              </li>

              <li className="flex space-x-3">
                <Hammer className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Home Builders & Developments
                  </span>
                  Content and marketing for home builders and developers across
                  residential and commercial projects, including single-family,
                  multi-family, and mixed-use developments. We focus on
                  showcasing design, scale, and finished spaces with clarity and
                  consistency.
                </span>
              </li>

              <li className="flex space-x-3">
                <Wrench className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Renovation & Construction Companies
                  </span>
                  Media and content for companies handling renovations,
                  construction, demolition, and rebuilds. Our visuals highlight
                  process, craftsmanship, and completed work, supporting both
                  marketing and documentation needs.
                </span>
              </li>

              <li className="flex space-x-3">
                <Truck className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Large-Scale & Civil Construction
                  </span>
                  Visual documentation and marketing for large-scale
                  construction projects, including excavation, shoring, piling,
                  and major infrastructure work. Our focus is on capturing
                  scale, coordination, and on-site execution.
                </span>
              </li>
            </ul>

            <Link href="/projects">
              <Button>View Our Work</Button>
            </Link>
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
              <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-white pt-[15%] hidden lg:flex" />
            </div>
          </div>
        </div>

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
              <div className="absolute -inset-x-20 bottom-0 bg-linear-to-t from-white pt-[15%] hidden lg:flex" />
            </div>
          </div>

          <div className="text-black sm:text-lg">
            <h3 className="mb-1 text-2xl leading-2xl font-semibold">
              Brands, Experiences & Organizations
            </h3>

            <p className="mb-8 text-sm leading-sm">
              We work with brands where visibility, consistency, and
              presentation are essential.
            </p>

            <ul className="my-7 space-y-5 border-t border-gray-300 pt-8">
              <li className="flex space-x-3">
                <Dumbbell className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Fitness & Sports
                  </span>
                  Content, social media, and digital support for personal
                  trainers, gyms, sports teams, and sports brands. Our work is
                  built to reflect performance, culture, and brand identity
                  across platforms.
                </span>
              </li>

              <li className="flex space-x-3">
                <Users className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Personal Branding & Corporations
                  </span>
                  Branding, content, websites, and marketing for individuals and
                  companies looking to establish a clear, professional presence.
                  We support both personal brands and corporate teams with
                  consistent, high-quality visuals.
                </span>
              </li>

              <li className="flex space-x-3">
                <Sparkles className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">
                    Health & Beauty
                  </span>
                  Visual content and digital support for clinics, wellness
                  brands, salons, and aesthetic businesses. Our approach focuses
                  on trust, presentation, and clean, professional branding.
                </span>
              </li>

              <li className="flex space-x-3">
                <Calendar className="h-5 w-5 shrink-0" />
                <span className="text-sm leading-sm">
                  <span className="font-semibold block mb-1">Events</span>
                  Coverage for events of all sizes, from multi-day productions
                  to smaller gatherings. We capture atmosphere, key moments, and
                  content designed for post-event use and promotion.
                </span>
              </li>
            </ul>

            <Link href="/contact">
              <Button>Start a Project</Button>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default ServicesFeatures;
