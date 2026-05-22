import Link from 'next/link';
import { Button, Container, Heading, ImageKit } from './';
import { UserRound } from 'lucide-react';

const members = [
  {
    name: 'Aryan Ghasemi',
    role: 'Founder - CEO',
    avatar: '/aryan-ghasemi-team.png',
    link: '/blogs/authors/aryan-ghasemi',
  },
  {
    name: 'Saman Hoseinpour',
    role: 'Co-Founder - CTO',
    avatar: '/saman-hoseinpour-team.png',
    link: '/blogs/authors/saman-hoseinpour',
  },
  {
    name: 'Arshia Farrahi',
    role: 'Chief Operating Officer',
    avatar: '/arshia-farahi-team.png',
    link: '/blogs/authors/arshia-farahi',
  },
  {
    name: 'Sepehr Barzegari',
    role: 'Marketing Specialist',
    avatar: '/sepehrbarzegari-team.webp',
    link: '',
  },
  {
    name: 'Sajjad Hoseinpour',
    role: 'Post Production Specialist',
    avatar: '/sajad-hoseinpour-team.png',
    link: '',
  },
  {
    name: 'Mehdi Ebrahimi',
    role: 'Post Production Specialist',
    avatar: '/mehdi-ebrahimi-team.png',
    link: '',
  },
  {
    name: 'Stevens Mai',
    role: 'Videographer',
    avatar: '/stevensmaiteam.webp',
    link: '',
  },
];

const Team = () => {
  return (
    <section className="py-16">
      <Container>
        <Heading
          titleTag="h2"
          seperatorTitle="06 — Team"
          eyebrowRight="Studio Leads"
          title="Our Team"
          titleAccent="The people behind the work."
          description="Meet the strategists, operators, marketers, and creators shaping the work at Perseus Creative Studio."
          containerStyle="px-0 md:px-0 w-full max-w-none"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <div className="mt-10">
          <div className="grid gap-x-6 gap-y-12 grid-cols-2 lg:grid-cols-4">
            {members.map((member, index) => (
              <Link
                href={member.link}
                key={index}
                className="group overflow-hidden"
              >
                <ImageKit
                  className="h-96 w-full rounded-md object-cover object-center transition-all duration-500 group-hover:h-90 group-hover:rounded-xl"
                  src={member.avatar}
                  alt="team member profile picture"
                  width="826"
                  height="1239"
                />
                <div className="px-2 pt-2 sm:pb-0 sm:pt-4">
                  <div className="flex justify-between">
                    <h3 className="font-medium transition-all duration-500 group-hover:tracking-tight">
                      {member.name}
                    </h3>
                    <span className="text-xs">_0{index + 1}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-black/70 inline-block translate-y-6 text-xs opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {member.role}
                    </span>
                    {member.link && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        icon={UserRound}
                        className="pointer-events-none h-7 translate-y-8 px-2.5 text-[11px] font-medium opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        Profile
                      </Button>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Team;
