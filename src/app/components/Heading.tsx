import React from "react";
import { twMerge } from "tailwind-merge";

import { Container } from "../components";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface HeadingProps {
  seperatorTitle?: string;
  seperatorTitleStyle?: string;
  title: string;
  titleTag?: HeadingTag;
  description: string;
  containerStyle?: string;
  descStyle?: string;
  titleStyle?: string;
}

const Heading = ({
  seperatorTitle,
  title,
  titleTag = "h2",
  description,
  containerStyle,
  seperatorTitleStyle,
  descStyle,
  titleStyle,
}: HeadingProps) => {
  const TitleTag = titleTag;

  return (
    <Container className={twMerge("border-t border-black", containerStyle)}>
      <span
        className={twMerge(
          "-ml-6 -mt-8 px-6 block w-max text-black dark:text-white",
          seperatorTitleStyle
        )}
      >
        {seperatorTitle}
      </span>
      <TitleTag
        className={twMerge(
          "mt-12 sm:mt-16 font-bold text-3xl leading-3xl sm:text-4xl sm:leading-4xl text-black dark:text-white",
          titleStyle
        )}
      >
        {title}
      </TitleTag>
      <p
        className={twMerge(
          "text-sm font-semibold text-black/70 dark:text-white/70 pb-8 pt-2",
          descStyle
        )}
      >
        {description}
      </p>
    </Container>
  );
};

export default Heading;
