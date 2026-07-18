import Instagram from '@/components/Mdx/Instagram';
import YouTube from '@/components/YouTube';
import Container from '@/components/ui/Container';
import type { ProjectEmbedRef } from '../types';
import { SlateTag } from '../SlateTag';
import { pad2, parseInstagramRef } from '../utils';

interface ProjectEmbedsProps {
  embeds: ProjectEmbedRef[];
  projectTitle: string;
}

/**
 * The remaining reels from the engagement — every embed that didn't take the
 * screening-room slot up top. YouTube refs ride the click-to-load facade (the
 * player only downloads on demand); Instagram refs are parsed back out of
 * their stored canonical URL, and a malformed ref is skipped rather than
 * crashing the page.
 */
const ProjectEmbeds = ({ embeds, projectTitle }: ProjectEmbedsProps) => {
  const frames = embeds
    .map((embed) => {
      if (embed.kind === 'youtube') {
        return (
          <YouTube key={embed.id} id={embed.ref} title={projectTitle} />
        );
      }
      const parsed = parseInstagramRef(embed.ref);
      return parsed ? (
        <Instagram key={embed.id} id={parsed.id} type={parsed.type} />
      ) : null;
    })
    .filter(Boolean);
  if (frames.length === 0) return null;

  return (
    <section className="pt-16 sm:pt-24">
      <Container>
        <div className="flex items-center gap-4">
          <SlateTag as="h2" size="md" className="whitespace-nowrap text-black/60">
            From the shoot
          </SlateTag>
          <span aria-hidden className="h-px flex-1 bg-black/10" />
          <SlateTag className="whitespace-nowrap tabular-nums text-black/45">
            {pad2(frames.length)} {frames.length === 1 ? 'reel' : 'reels'}
          </SlateTag>
        </div>

        <div className="mt-4">{frames}</div>
      </Container>
    </section>
  );
};

export default ProjectEmbeds;
