'use client';

import { useState } from 'react';
import { ChangeTheme, HorzCarousel, Services, TvCarousel } from '../';

const Theme = () => {
  const [theme, setTheme] = useState('dark');

  return (
    <section data-theme={`${theme}`}>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        <TvCarousel />
      </ChangeTheme>
      <ChangeTheme theme="light" setTheme={setTheme}>
        <Services />
        <HorzCarousel />
      </ChangeTheme>
      <ChangeTheme theme="dark" setTheme={setTheme}>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Praesentium
        debitis a placeat. Earum, sit tenetur eius nihil doloremque nobis
        provident cumque tempora. Exercitationem illum laudantium odit nobis
        modi vel non!
      </ChangeTheme>
      <ChangeTheme theme="light" setTheme={setTheme}>
        Lorem ipsum dolor sit amet consectetur adipisicing elit. Aliquid commodi
        quam iste modi quae? Quisquam perferendis libero sed doloribus pariatur
        sequi mollitia maiores, rem eligendi, aut quia architecto. Facere,
        tenetur?
      </ChangeTheme>
    </section>
  );
};

export default Theme;
