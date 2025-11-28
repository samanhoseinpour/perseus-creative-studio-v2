import Link from "next/link";

import { ImageKit, Container } from "./";

const masonryHomeGallery = [
  [
    {
      id: "image-1",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image.jpg",
      width: 610,
      height: 768,
      alt: "",
      href: "/contact",
      overlayTitle: "Diba Windows Showroom",
      category: "Construction",
    },
    {
      id: "image-2",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-1.jpg",
      width: 610,
      height: 500,
      alt: "",
      href: "/contact",
      overlayTitle: "Arani Construction",
      category: "Construction",
    },
    {
      id: "image-3",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-2.jpg",
      width: 610,
      height: 566,
      alt: "",
      href: "/contact",
      overlayTitle: "Iron Nation Fitness",
      category: "Construction",
    },
  ],
  [
    {
      id: "image-4",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-3.jpg",
      width: 610,
      height: 768,
      alt: "",
      href: "/contact",
      overlayTitle: "Obsidian Athletic Club",
      category: "Construction",
    },
    {
      id: "image-5",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-4.jpg",
      width: 610,
      height: 500,
      alt: "",
      href: "/contact",
      overlayTitle: "Westbank",
      category: "Construction",
    },
    {
      id: "image-6",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-5.jpg",
      width: 610,
      height: 566,
      alt: "",
      href: "/contact",
      overlayTitle: "Cinematic Wedding",
      category: "Construction",
    },
  ],
  [
    {
      id: "image-7",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-6.jpg",
      width: 610,
      height: 768,
      alt: "",
      href: "/contact",
      overlayTitle: "Baseball Game",
      category: "Construction",
    },
    {
      id: "image-8",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-7.jpg",
      width: 610,
      height: 500,
      alt: "",
      href: "/contact",
      overlayTitle: "Diba Windows Showroom",
      category: "Construction",
    },
    {
      id: "image-9",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-8.jpg",
      width: 610,
      height: 566,
      alt: "",
      href: "/contact",
      overlayTitle: "Arani Construction",
      category: "Construction",
    },
  ],
  [
    {
      id: "image-10",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-9.jpg",
      width: 610,
      height: 768,
      alt: "",
      href: "/contact",
      overlayTitle: "Iron Nation Fitness",
      category: "Construction",
    },
    {
      id: "image-11",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-10.jpg",
      width: 610,
      height: 500,
      alt: "",
      href: "/contact",
      overlayTitle: "Obsidian Athletic Club",
      category: "Construction",
    },
    {
      id: "image-12",
      src: "https://flowbite.s3.amazonaws.com/docs/gallery/masonry/image-11.jpg",
      width: 610,
      height: 566,
      alt: "",
      href: "/contact",
      overlayTitle: "Westbank",
      category: "Construction",
    },
  ],
];

const MasonryGallery = () => {
  return (
    <Container className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {masonryHomeGallery.map((column, columnIndex) => (
        <div key={columnIndex} className="grid gap-4">
          {column.map((item) => (
            <Link key={item.id} href={item.href}>
              <div className="relative group">
                <ImageKit
                  className="h-auto max-w-full opacity-50 transition-opacity duration-500 group-hover:opacity-80"
                  src={item.src}
                  width={item.width}
                  height={item.height}
                  alt={item.alt}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                  <h3 className="text-sm leading-sm font-bold">
                    {item.overlayTitle}
                  </h3>
                  <p className="font-semibold text-[10px] leading-xs text-white">
                    {item.category}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ))}
    </Container>
  );
};

export default MasonryGallery;
