import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Container } from "../";

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
    <Container className="">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <h2 className="font-semibold text-white text-5xl leading-5xl text-center mb-8">
          Questions? Awnsers.
        </h2>
        <dl className="divide-y divide-white/30">
          {faqs.map((faq) => (
            <Disclosure
              key={faq.id}
              as="div"
              className="py-6 first:pt-0 last:pb-0"
            >
              <dt>
                <DisclosureButton className="group flex w-full items-start justify-between text-left text-white cursor-pointer">
                  <span className="text-xl leading-xl font-semibold">
                    {faq.question}
                  </span>
                  <span className="ml-6 flex h-7 items-center">
                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-6 group-data-open:hidden"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 4.5v15m7.5-7.5h-15"
                      />
                    </svg>

                    <svg
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="1.5"
                      stroke="currentColor"
                      className="size-6 group-not-data-open:hidden"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 12h14"
                      />
                    </svg>
                  </span>
                </DisclosureButton>
              </dt>
              <DisclosurePanel className="mt-2 pr-12">
                <p className="text-md leading-md text-white">{faq.answer}</p>
              </DisclosurePanel>
            </Disclosure>
          ))}
        </dl>
      </div>
    </Container>
  );
};

export default Faq;
