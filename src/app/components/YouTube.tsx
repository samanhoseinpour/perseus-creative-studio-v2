const YouTube = ({ id }: { id: string }) => (
  <div className="my-8 aspect-video w-full overflow-hidden rounded-2xl">
    <iframe
      className="h-full w-full"
      src={`https://www.youtube.com/embed/${id}`}
      title="YouTube video"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  </div>
);

export default YouTube;
