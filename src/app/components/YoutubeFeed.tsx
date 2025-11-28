import { youtubeEmbedIds } from "@/app/constants/index";
import Button from "./Button";

const YoutubeFeed = () => {
  return (
    <section className="py-12">
      <div className="flex flex-wrap gap-4 px-6 justify-center">
        {youtubeEmbedIds.map((youtubeEmbedId) => (
          <iframe
            key={youtubeEmbedId.id}
            title={`YouTube video ${youtubeEmbedId.id}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            src={`https://www.youtube.com/embed/${youtubeEmbedId.embedId}`}
            width={400}
            height={230}
            className="rounded-lg"
          />
        ))}
      </div>
      <a
        href="https://www.youtube.com/@PerseusCreativeStudio/playlists"
        target="_blank"
        rel="noopener noreferrer"
        className="flex justify-center items-center mt-12"
      >
        <Button>All Case Studies</Button>
      </a>
    </section>
  );
};

export default YoutubeFeed;
