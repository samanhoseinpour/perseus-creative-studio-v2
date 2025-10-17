import { Testimonials } from "..";

const HomeTestimonials = () => {
  const testimonials = [
    {
      quote:
        "Perseus delivered a brand and site that elevated our pre‑sale conversions and investor confidence within weeks. Their positioning work and sales collateral gave our team a consistent story from pitch deck to website. We saw higher‑quality leads and a shorter decision cycle post‑launch.",
      name: "Soheil Mohamadi",
      designation: "CEO of Vela Homes",
      src: "Hp4rRrbfCc4",
    },
    {
      quote:
        "From strategy to execution, the team moved with precision. Our launch assets were cohesive and on‑message, backed by a clear design system and content guidelines. The workflow reduced rework and kept momentum from discovery through rollout.",
      name: "Arshia Esmaeili",
      designation: "Founder & Creative Director, Perseus Creative Studio",
      src: "T8FWp9bSkq4",
    },
    {
      quote:
        "The new digital presence streamlined lead capture and shortened our sales cycle across key markets. Integrations with our CRM and analytics created visibility from campaign to contract. We now iterate on data, not assumptions.",
      name: "Amir Hosseini",
      designation: "CEO of Aurora Development Group",
      src: "kAGF5m3L8AU",
    },
    {
      quote:
        "Clear process, strong design systems, and reliable delivery. Documentation and handoffs made it easy for our in‑house team to maintain quality without bottlenecks. Deadlines were met and scope stayed controlled.",
      name: "Nima Farzad",
      designation: "CEO of Meridian Capital Partners",
      src: "iTpstvVWhGg",
    },
    {
      quote:
        "Perseus helped us articulate our value proposition and translate it into a high‑performing website. The messaging architecture and visual identity unified our proposals, site, and social content. Inquiries now reference the exact differentiators we wanted to lead with.",
      name: "Sara Khademi",
      designation: "CEO of Solstice Interiors",
      src: "eO0sFqbl6HM",
    },
  ];
  return <Testimonials testimonials={testimonials} />;
};

export default HomeTestimonials;
