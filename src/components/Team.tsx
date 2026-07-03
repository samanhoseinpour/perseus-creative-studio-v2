import Link from 'next/link';
import Button from '@/components/Button';
import Container from '@/components/ui/Container';
import Heading from '@/components/Heading';
import Img from '@/components/Img';
import { LuUserRound as UserRound } from 'react-icons/lu';
import { ABOUT_TEAM_HEADING, TEAM_MEMBERS } from '@/constants/about';

const members = TEAM_MEMBERS;

const Team = () => {
  return (
    <section className="py-16">
      <Container>
        <Heading
          titleTag="h2"
          {...ABOUT_TEAM_HEADING}
          containerStyle="px-0 md:px-0 w-full max-w-none"
          titleStyle="max-w-4xl"
          descStyle="max-w-3xl"
        />
        <div className="mt-10">
          <div className="grid gap-x-6 gap-y-12 grid-cols-2 lg:grid-cols-5">
            {members.map((member, index) => {
              const card = (
                <>
                  <Img
                    className="h-70 w-full rounded-md object-cover object-center transition-all duration-500 group-hover:h-64 group-hover:rounded-xl"
                    src={member.avatar}
                    alt={`${member.name}, ${member.role} at Perseus Creative Studio`}
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
                </>
              );

              return member.link ? (
                <Link
                  href={member.link}
                  key={index}
                  className="group overflow-hidden"
                >
                  {card}
                </Link>
              ) : (
                <div key={index} className="group overflow-hidden">
                  {card}
                </div>
              );
            })}
          </div>
        </div>
      </Container>
    </section>
  );
};

export default Team;
