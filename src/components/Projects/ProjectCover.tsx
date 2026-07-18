import Img from '@/components/Img';
import ProjectMediaImage from '@/components/ProjectMediaImage';
import type { ProjectCoverData } from '@/components/Projects/types';

/**
 * THE branch point for a project's cover slot: seeded static /images assets
 * ride <Img> (pre-generated ladder + blurFor lookup), /admin uploads ride
 * <ProjectMediaImage> (stored rungs + stored LQIP). Server component — the
 * static branch's blur lookup is server-only; client parents receive the
 * rendered element as children instead of importing this.
 */
const ProjectCover = ({
  cover,
  sizes,
  fill,
  priority,
  loading,
  width,
  height,
  className,
}: {
  cover: ProjectCoverData;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  width?: number;
  height?: number;
  className?: string;
}) =>
  cover.type === 'media' ? (
    <ProjectMediaImage
      variants={cover.variants}
      alt={cover.alt}
      blurDataUrl={cover.blurDataUrl}
      sizes={sizes}
      fill={fill}
      priority={priority}
      loading={loading}
      width={width}
      height={height}
      className={className}
    />
  ) : (
    <Img
      src={cover.src}
      alt={cover.alt}
      sizes={sizes}
      fill={fill}
      priority={priority}
      loading={loading}
      width={width}
      height={height}
      className={className}
    />
  );

export default ProjectCover;
