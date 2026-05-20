type YouTubeProps = {
  id: string;
  // Optional metadata consumed by the page-level VideoObject JSON-LD.
  // Authors don't have to set these — fallbacks come from the nearest
  // preceding H2/H3 and the article's publish date.
  title?: string;
  description?: string;
  uploadDate?: string;
};

const YouTube = ({ id, title }: YouTubeProps) => (
  <div className="my-8 aspect-video w-full overflow-hidden rounded-2xl">
    <iframe
      className="h-full w-full"
      src={`https://www.youtube.com/embed/${id}`}
      title={title ?? 'YouTube video'}
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
);

export default YouTube;
