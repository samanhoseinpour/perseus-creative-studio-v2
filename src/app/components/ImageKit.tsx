import { Image } from "@imagekit/next";
import { ImageKitProps } from "@/app/utils/types";
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
}: ImageKitProps) => {
  return (
    <Image
      urlEndpoint="https://ik.imagekit.io/perseus"
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      sizes={sizes}
      fill={fill}
      className={twMerge("rounded-lg", className)}
    />
  );
};

export default ImageKit;
