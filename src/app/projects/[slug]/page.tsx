import { ProjectHero, ProjectTitle, ProjectSection } from "@/app/components";

const ProjectDetailPage = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;

  return (
    <main>
      <ProjectHero />
      <ProjectTitle title={slug} />
      <ProjectSection />
    </main>
  );
};

export default ProjectDetailPage;
