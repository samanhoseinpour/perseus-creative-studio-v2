'use client';

import { useState } from 'react';
import { ChangeTheme, Services, TvCarousel, About } from '../';

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
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Eaque qui error
        blanditiis, architecto iste laboriosam assumenda consequuntur sunt
        incidunt quidem, atque minima sit! Repellat amet, officia odio quaerat
        sit doloremque!
      </ChangeTheme>
      <ChangeTheme theme="light" setTheme={setTheme}>
        .
      </ChangeTheme>
    </section>
  );
};

export default Theme;
