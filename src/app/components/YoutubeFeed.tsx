import { youtubeEmbedIds } from '@/app/constants/index';
import { Button, Container } from './';

const YoutubeFeed = () => {
  return (
    <section className="py-12">
      <Container>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 lg:grid-cols-4 gap-4">
          {youtubeEmbedIds.map((youtubeEmbedId) => (
            <iframe
              key={youtubeEmbedId.id}
              title={`YouTube video ${youtubeEmbedId.id}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              src={`https://www.youtube.com/embed/${youtubeEmbedId.embedId}`}
              className="rounded-lg aspect-video"
            />
          ))}
        </div>
      </Container>
      <a
        href="https://www.youtube.com/@PerseusCreativeStudio/playlists"
        target="_blank"
        rel="noopener noreferrer"
        className="flex justify-center items-center mt-12"
      >
        <Button>View More Projects</Button>
      </a>
    </section>
  );
};

export default YoutubeFeed;
