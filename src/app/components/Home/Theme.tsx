"use client";

import { useState } from "react";
import {
  ChangeTheme,
  TvCarousel,
  ServicesCarousel,
  FeatureProjects,
  Partners,
  FaqsAccordion,
  HomeTestimonials,
  FromTheBlog,
  HomeWelcome,
} from "../";

const Theme = () => {
  const [theme, setTheme] = useState("dark");

  return (
    <section data-theme={`${theme}`}>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <TvCarousel />
        <HomeWelcome />
      </ChangeTheme>
      <ChangeTheme theme="light" setTheme={setTheme}>
        <ServicesCarousel />
        <FeatureProjects />
      </ChangeTheme>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <Partners />
        <HomeTestimonials />
        <FaqsAccordion />
        <FromTheBlog />
      </ChangeTheme>
    </section>
  );
};

export default Theme;
