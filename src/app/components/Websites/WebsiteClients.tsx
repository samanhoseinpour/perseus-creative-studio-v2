import { ImageKit, Button, Container, TextEffect, AnimatedGroup } from "../";
import { websiteCustomerLogos } from "@/app/constants/website";
import { ChevronRight } from "lucide-react";
import Link from "next/link";

const WebsiteClients = () => {
  return (
    <section className="mb-24">
      <Container>
        <TextEffect as="h6" className="text-center text-xl">
          Your favorite companies are our partners.
        </TextEffect>
        <div className="group relative m-auto max-w-5xl px-6">
          <div className="absolute inset-0 z-10 flex scale-95 items-center justify-center opacity-0 duration-500 group-hover:scale-100 group-hover:opacity-100">
            <Link
              href="/contact"
              className="block text-sm duration-150 hover:opacity-75"
            >
              <Button size="medium">
                Join Them
                <ChevronRight className="ml-2 inline-block size-3" />
              </Button>
            </Link>
          </div>
          <AnimatedGroup className="group-hover:blur-xs mx-auto mt-12 grid max-w-2xl grid-cols-4 gap-x-12 gap-y-8 transition-all duration-500 group-hover:opacity-50 sm:gap-x-16 sm:gap-y-14">
            {websiteCustomerLogos.map((client) => (
              <div className="flex" key={client.id}>
                <ImageKit
                  className="mx-auto h-5 w-fit brightness-0 invert-100"
                  src={client.src}
                  alt={client.alt}
                  height={client.height}
                  width={client.width}
                />
              </div>
            ))}
          </AnimatedGroup>
        </div>
      </Container>
    </section>
  );
};

export default WebsiteClients;
