import Link from "next/link";
import { masonryHomeGallery } from "../constants";
import { ImageKit, Container } from "./";

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
