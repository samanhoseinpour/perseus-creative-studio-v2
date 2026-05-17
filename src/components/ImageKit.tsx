import { Image } from "@imagekit/next";
import { ImageKitProps } from "@/utils/types";
import { twMerge } from "tailwind-merge";

const ImageKit = ({
  src,
  alt,
  width,
  height,
  loading = "lazy",
  className,
  sizes,
  fill,
  priority,
  quality,
}: ImageKitProps) => {
  return (
    <Image
      urlEndpoint="https://ik.imagekit.io/perseus"
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? undefined : loading}
      priority={priority}
      sizes={sizes}
      fill={fill}
      quality={quality}
      draggable={false}
      className={twMerge("rounded-lg", className)}
    />
  );
};

export default ImageKit;
