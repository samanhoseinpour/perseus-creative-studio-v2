import { Image, ImageKitProvider } from '@imagekit/next';
import { ImageKitProps } from '@/app/utils/types';
import { twMerge } from 'tailwind-merge';

const ImageKit = ({
  src,
  alt,
  width,
  height,
  loading,
  className,
  sizes,
  fill,
}: ImageKitProps) => {
  return (
    <ImageKitProvider urlEndpoint="https://ik.imagekit.io/perseus">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        sizes={sizes}
        fill={fill}
        className={twMerge('rounded-lg', className)}
      />
    </ImageKitProvider>
  );
};

export default ImageKit;
