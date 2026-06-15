// ImageKit
export interface ImageKitProps {
  src: string;
  width?: number | `${number}`;
  height?: number | `${number}`;
  alt: string;
  loading?: "lazy" | "eager";
  className?: string;
  sizes?: string;
  fill?: boolean;
  priority?: boolean;
  quality?: number;
  // ImageKit URL transformations (e.g. cm-extract crops), passed through to
  // @imagekit/next's <Image transformation={...}>.
  transformation?: import("@imagekit/next").SrcOptions["transformation"];
}

export interface VideoKitProps {
  src: string;
  width?: number | string;
  height?: number | string;
  alt: string;
  loading?: "lazy" | "eager";
  className?: string;
  sizes?: string;
  fill?: boolean;
}

// Container
export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}
