import { Container, ImageKit } from "./";

const members = [
  {
    name: "Aryan Ghasemi",
    role: "Founder - CEO",
    avatar: "/aryan-ghasemi-team.png",
    link: "https://www.linkedin.com/in/aryan-ghasemi-80043424a/",
  },
  {
    name: "Saman Hoseinpour",
    role: "Software Engineer",
    avatar: "/saman-hoseinpour-team.png",
    link: "https://www.linkedin.com/in/saman-hoseinpour-202280221/",
  },
  {
    name: "Arshia Farahi",
    role: "Chief Operating Officer",
    avatar: "/arshia-farahi-team.png",
    link: "https://www.linkedin.com/in/arshia-farrahi-a0a849330/",
  },
  {
    name: "Amirali Azimzadeh",
    role: "Chief Marketing Officer",
    avatar: "/amirali-azimzadeh-team.png",
    link: "https://www.linkedin.com/in/amiraliazimzadeh/",
  },
];

const Team = () => {
  return (
    <section className="bg-white text-black pb-16 sm:pb-32">
      <Container className="border-t">
        <span className="-ml-6 -mt-3.5 block w-max bg-gray-50 px-6 dark:bg-gray-950">
          Team
        </span>
        <div className="mt-12 gap-4 sm:grid sm:grid-cols-2 sm:mt-24">
          <div className="sm:w-2/5">
            <h3 className="text-3xl font-bold sm:text-4xl">Our Team</h3>
          </div>
          <div className="mt-6 sm:mt-0">
            <p>
              During the working process, we perform regular fitting with the
              client because he is the only person who can feel whether a new
              suit fits or not.
            </p>
          </div>
        </div>
        <div className="mt-12 md:mt-24">
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {members.map((member, index) => (
              <div key={index} className="group overflow-hidden">
                <ImageKit
                  className="h-96 w-full rounded-md object-cover object-center transition-all duration-500 group-hover:h-90 group-hover:rounded-xl"
                  src={member.avatar}
                  alt="team member profile picture"
                  width="826"
                  height="1239"
                />
                <div className="px-2 pt-2 sm:pb-0 sm:pt-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium transition-all duration-500 group-hover:tracking-wider">
                      {member.name}
                    </h3>
                    <span className="text-xs">_0{index + 1}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-black/70 inline-block translate-y-6 text-sm opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {member.role}
                    </span>
                    <a
                      href={member.link}
                      target="_blank"
                      className="group-hover:text-primary-600 dark:group-hover:text-primary-400 inline-block translate-y-8 text-sm tracking-wide opacity-0 transition-all duration-500 hover:underline group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      {" "}
                      Career
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Team;
