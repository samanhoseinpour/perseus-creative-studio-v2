'use client';

import { useState } from 'react';
import { ChangeTheme, Services, TvCarousel, About, Partners, Faq } from '../';

const Theme = () => {
  const [theme, setTheme] = useState('dark');

  return (
    <section data-theme={`${theme}`}>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <TvCarousel />
      </ChangeTheme>
      <ChangeTheme theme="light" setTheme={setTheme}>
        <Services />
        {/* <HorzCarousel /> */}
      </ChangeTheme>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <About />
        <Partners />
        <Faq />
      </ChangeTheme>
    </section>
  );
};

export default Theme;
