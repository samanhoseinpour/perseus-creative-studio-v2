type YoutubeEmbed = {
  id: number;
  embedId: string;
};

interface CarouselRowProps {
  embedIds: YoutubeEmbed[];
  animationClass?: string;
  itemWidth?: number;
  itemHeight?: number;
  animationDuration?: number;
}

const CarouselRow: React.FC<CarouselRowProps> = ({
  embedIds = [],
  animationClass = '',
  itemWidth = 400,
  itemHeight = 225,
}) => {
  // Duplicate the list for seamless looping
  const items = [...embedIds, ...embedIds];

  return (
    <div className={`flex ${animationClass}`}>
      <div className="flex items-start justify-around gap-x-3 w-max">
        {items.map((youtubeEmbedId, idx) => (
          <iframe
            key={`${youtubeEmbedId.id}-${idx}`}
            title="YouTube video player"
            allow="accelerometer autoplay clipboard-write encrypted-media gyroscope"
            allowFullScreen
            className="rounded-lg duration-1000 mt-6 hover:opacity-80 max-2xl:flex-grow max-sm:flex-col object-cover"
            src={`https://www.youtube.com/embed/${youtubeEmbedId.embedId}`}
            width={itemWidth}
            height={itemHeight}
          />
        ))}
      </div>
    </div>
  );
};

export default CarouselRow;
