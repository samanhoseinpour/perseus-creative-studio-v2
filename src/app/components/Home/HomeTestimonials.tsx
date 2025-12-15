import { Partners, Testimonials, Container } from "..";

const HomeTestimonials = () => {
  const testimonials = [
    {
      quote:
        "I’ve worked with 20+ videographers over the last 10 years, Aryan and his team truly stand out. His personality, work ethic, and creativity are exceptional. Highly recommended.",
      name: "Amin Meysami",
      designation: "Real Estate Agent",
      src: "pjDQN3riSKg",
    },
    {
      quote:
        "We’ve been working with the Perseus team for the past 2 years. Working with them has streamlined our processes in advertisement and boosted productivity. Highly recommended!",
      name: "Soheil Mohammadi",
      designation: "CEO Of Vela Homes",
      src: "rT-yxZx9CL0",
    },
    {
      quote:
        "Working with Perseus has been an amazing experience. My industry requires a lot of attention to little details in pest control and Aryan was able to jump in and really take on the information to help create one off content that no one else is doing in my industry. We are working our way to the top of the industry and he is making our vision come to reality with his work and understanding exactly what it is that we were asking for. My team and I love working with him and he goes above and beyond in every way possible to make ends meet. Always on time and the turn around time has been so quick too. Quality of work is top notch and he genuinely delivers so much value and makes sure to go above and beyond for every project.",
      name: "Amirali Banihashemi",
      designation: "CEO Of Phantom Pest Control",
      src: "EjZHDZnoFeU",
    },
    {
      quote:
        "I can't say enough good things about Perseus! They've been instrumental in taking my real estate business to the next level. Their videography skills are top-notch—every video they've created for me has been of the highest quality, with stunning visuals and seamless edits that truly capture the essence of the properties I represent. Beyond their incredible video work, their marketing strategies have been a game-changer. They've helped me reach a broader audience and grow my business in ways I couldn't have imagined. Their expertise in creating targeted and effective campaigns has consistently delivered results. If you're looking for a team that goes above and beyond in both videography and marketing, look no further. They are the best in the business, and I'm thrilled to have them as a part of my success story!",
      name: "Arshia Esmaeili",
      designation: "Real Estate Agent",
      src: "iMf15-OTAso",
    },
    {
      quote:
        "We had a great experience working with these guys. Not only did they design a clean and professional website for us, but they also helped create content for our Instagram. They were easy to work with, quick to respond, and really understood our style. Everything was done on time, and the results were better than we expected. Highly recommend!",
      name: "Arash Farrokh",
      designation: "CEO Of Diba Windows",
      src: "T8FWp9bSkq4",
    },
    {
      quote:
        "These guys have been an essential part of our marketing team—we always use them for all our listing photos and videos. They consistently deliver high-quality work, are super easy to work with, and understand exactly what we need. They’ve helped bring our listings to life and made a big difference in how we present our properties. We couldn’t be happier with the results!",
      name: "Paolo Cartocci",
      designation: "Real Estate Agent",
      src: "rs1W8kfQc3U",
    },
    {
      quote:
        "We have had the pleasure of working with Aryan and his team at Perseus Studio for our Residential Homes in Vancouver these past few months and the guys have been great. We have had photos and videos done and they have been very accommodating and understood our style and concept. They are very professional and attentive while easy to communicate with. Highly recommend and look forward to working with them for future projects!",
      name: "Asanti Homes",
      designation: "Home Builder",
      src: "9QE7t69UPCE",
    },
    {
      quote:
        "Working with Perseus has been a game-changer for us at Obsidian Athletic Club. Their ability to capture the spirit and energy of our gym is unmatched. Every video they’ve produced tells a story—dynamic, visually stunning, and completely authentic to who we are as a brand. What really sets them apart is their attention to detail and commitment to excellence. They take the time to understand our goals, our culture, and the experience we want to share, then translate that into content that feels both elevated and real. The result has been a huge step forward in how we present ourselves to current and future members. From concept to final cut, the Perseus team is professional, collaborative, and creative. They’re not just videographers—they’re true partners in helping us grow our brand and connect with our community. If you’re looking for a production team that delivers both quality and vision, Perseus is the one to call.",
      name: "Jarred Ethan",
      designation: "Manager Of Obsidian Athletic Club",
      src: "T09VEdyk6cs",
    },
    {
      quote:
        "Working with Aryan from Perseus Creative Studio has been an outstanding experience. His creativity, professionalism, and attention to detail are next level. He knows how to capture the energy and story behind every project, and the final videos always exceed expectations. Aryan is easy to work with, organized, and consistently delivers top-quality results. Highly recommend him to anyone looking to take their photo and video content to the next level.",
      name: "Domenic Sorace",
      designation: "CEO Of Valroc Development",
      src: "eO0sFqbl6HM",
    },
    {
      quote:
        "Working with Perseus Creative Studio has been an amazing experience! They’ve helped us at Arani Construction with everything from professional video shoots and photography to website design and social media management — and the results have been outstanding. Their team is creative, organized, and always on time. They understand our vision and know exactly how to showcase our projects in the best light. The quality of their work has truly elevated our brand’s image and helped us connect better with our clients online. We highly recommend Perseus Creative Studio to any business looking for a reliable, talented, and friendly marketing team!",
      name: "Pedram Shayan",
      designation: "CEO Of Arani Construction",
      src: "KaukPra3j_s",
    },
    {
      quote:
        "Working with Perseus was a great experience from start to finish! They understand the construction industry and capture our projects perfectly, delivering high quality drone footage and visuals that truly represent our work. Communication was smooth, timelines were respected, and the final results delivered exactly as promised.",
      name: "Mojtaba Eslampour",
      designation: "Division Manager RS Foundation",
      src: "XTENqnPqPnM",
    },
  ];
  return (
    <section>
      <Testimonials testimonials={testimonials} />
      <Partners />
      <Container className="flex flex-col justify-start py-10">
        <div className="relative w-full overflow-hidden">
          <iframe
            title="Perseus Creative Studio Google Reviews"
            src="https://cbcdb1177dbf422aa37327393cf6f965.elf.site"
            height={900}
            className="w-[calc(100%+12px)] md:w-full h-[1050px] md:h-[900px]"
            style={{ border: 0 }}
          />
        </div>
      </Container>
    </section>
  );
};

export default HomeTestimonials;
