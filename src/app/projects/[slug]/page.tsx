import { ProjectHero, ProjectTitle, ProjectSection } from "@/app/components";

const ProjectDetailPage = ({ params }: { params: { slug: string } }) => {
  const { slug } = params;

  return (
    <main>
      <ProjectHero />
      <ProjectTitle title={slug} />
      <ProjectSection />
    </main>
  );
};

export default ProjectDetailPage;
