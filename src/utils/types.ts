// Image (self-hosted via next/image; see src/components/Img.tsx)
export interface ImgProps {
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
}

// Container
export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}
