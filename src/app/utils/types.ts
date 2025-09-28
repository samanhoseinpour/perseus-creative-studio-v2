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

// Navbar
export interface MenuLink {
  title: string;
  href: string;
  src: string;
}

export interface SelectedLink {
  isActive: boolean;
  index: number;
}

export interface NavImageProps {
  imgSrc: string;
  selectedLink: SelectedLink;
  alt: string;
}

export interface NavBodyProps {
  menuLinks: MenuLink[];
  selectedLink: SelectedLink;
  setSelectedLink: React.Dispatch<React.SetStateAction<SelectedLink>>;
}

// Container
export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}
