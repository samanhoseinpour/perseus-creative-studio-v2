import { twMerge } from "tailwind-merge";

import { Video } from "@imagekit/next";
import { VideoKitProps } from "@/app/utils/types";

const VideoKit = ({
  src,
  width,
  height,
  alt,
  loading,
  className,
}: VideoKitProps) => {
  return (
    <Video
      urlEndpoint="https://ik.imagekit.io/perseus"
      src={src}
      alt={alt}
      loading={loading}
      className={twMerge("rounded-lg", className)}
      autoPlay
      loop
      muted

      playsInline
      width={width}
      height={height}
    />
  );
};

export default VideoKit;
