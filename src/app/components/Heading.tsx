import React from "react";
import { twMerge } from "tailwind-merge";

import { Container } from "../components";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps {
  seperatorTitle: string;
  title: string;
  titleTag?: HeadingTag;
  description: string;
  containerStyle?: string;
  descStyle?: string;
}

const Heading = ({
  seperatorTitle,
  title,
  titleTag = "h2",
  description,
  containerStyle,
  descStyle,
}: HeadingProps) => {
  const TitleTag = titleTag;

  return (
    <Container className={twMerge("border-t border-white", containerStyle)}>
      <span className="-ml-6 -mt-8 block w-max">{seperatorTitle}</span>
      <TitleTag className="mt-12 sm:mt-24 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl text-white">
        {title}
      </TitleTag>
      <p
        className={twMerge(
          "text-sm font-semibold text-white/70 pb-8 pt-2",
          descStyle
        )}
      >
        {description}
      </p>
    </Container>
  );
};

export default Heading;
