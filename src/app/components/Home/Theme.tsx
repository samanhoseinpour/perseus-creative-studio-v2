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
} from "../";

const Theme = () => {
  const [theme, setTheme] = useState("dark");

  return (
    <section data-theme={`${theme}`}>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <TvCarousel />
      </ChangeTheme>
      <ChangeTheme theme="light" setTheme={setTheme}>
        <ServicesCarousel />
        <FeatureProjects />
        <Partners />
      </ChangeTheme>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <HomeTestimonials />
        <FaqsAccordion />
        <FromTheBlog />
      </ChangeTheme>
    </section>
  );
};

export default Theme;
