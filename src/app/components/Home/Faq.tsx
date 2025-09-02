import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Container, TextEffect } from "../";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    id: 1,
    question: "What's PERSEUS ?",
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eaque nesciunt exercitationem dicta illo ullam temporibus quam et ex quasi labore asperiores dignissimos placeat reprehenderit, quae mollitia aut ducimus. Rem, repellendus!",
  },
  {
    id: 2,
    question: "What's PERSEUS ?",
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eaque nesciunt exercitationem dicta illo ullam temporibus quam et ex quasi labore asperiores dignissimos placeat reprehenderit, quae mollitia aut ducimus. Rem, repellendus!",
  },
  {
    id: 3,
    question: "What's PERSEUS ?",
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eaque nesciunt exercitationem dicta illo ullam temporibus quam et ex quasi labore asperiores dignissimos placeat reprehenderit, quae mollitia aut ducimus. Rem, repellendus!",
  },
  {
    id: 4,
    question: "What's PERSEUS ?",
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eaque nesciunt exercitationem dicta illo ullam temporibus quam et ex quasi labore asperiores dignissimos placeat reprehenderit, quae mollitia aut ducimus. Rem, repellendus!",
  },
  {
    id: 5,
    question: "What's PERSEUS ?",
    answer:
      "Lorem ipsum dolor sit, amet consectetur adipisicing elit. Eaque nesciunt exercitationem dicta illo ullam temporibus quam et ex quasi labore asperiores dignissimos placeat reprehenderit, quae mollitia aut ducimus. Rem, repellendus!",
  },
];

const Faq = () => {
  return (
    <Container>
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <TextEffect
          as="h5"
          className="font-semibold text-white text-5xl text-center mb-8"
        >
          Questions? Answers.
        </TextEffect>

        <dl className="divide-y divide-white/30">
          {faqs.map((faq) => (
            <Disclosure
              key={faq.id}
              as="div"
              className="py-6 first:pt-0 last:pb-0"
            >
              {({ open }) => (
                <>
                  <dt>
                    <DisclosureButton className="group flex w-full items-start justify-between text-left text-white cursor-pointer">
                      <TextEffect as="span" className="text-xl font-semibold">
                        {faq.question}
                      </TextEffect>

                      {/* Cross-fade Plus/Minus for a clean toggle */}
                      <span className="ml-6 relative flex h-7 w-7 items-center justify-center">
                        <Plus
                          className={`size-6 absolute transition-opacity duration-200 ${
                            open ? "opacity-0" : "opacity-100"
                          }`}
                          aria-hidden="true"
                        />
                        <Minus
                          className={`size-6 transition-opacity duration-200 ${
                            open ? "opacity-100" : "opacity-0"
                          }`}
                          aria-hidden="true"
                        />
                      </span>
                    </DisclosureButton>
                  </dt>

                  {/* Smooth height animation using CSS grid.
                      Requires Tailwind v3.2+ for arbitrary data-[] variants. */}
                  <DisclosurePanel
                    static
                    className="
                      pr-12 overflow-hidden
                      grid grid-rows-[0fr]
                      transition-[grid-template-rows] duration-300 ease-out
                      data-[headlessui-state=open]:grid-rows-[1fr]
                    "
                  >
                    <div className="min-h-0 mt-2">
                      <TextEffect
                        as="p"
                        per="line"
                        className="text-md text-white"
                      >
                        {faq.answer}
                      </TextEffect>
                    </div>
                  </DisclosurePanel>
                </>
              )}
            </Disclosure>
          ))}
        </dl>

        <div className="flex justify-between items-center gap-8 mt-12 mb-16">
          <div className="text-md text-white">
            Need further assistance? We&rsquo;re here to help — give us a call
            at{" "}
            <a href="tel:+17788878363" className="font-extrabold underline">
              +1-778-887-8363
            </a>
            .
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Faq;
