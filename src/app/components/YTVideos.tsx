const YTVideos = () => {
  const youtubeEmbedIds = [
    { id: 1, embedId: 'P2vkIx5royE' },
    { id: 2, embedId: '4W4UqdZYEKs' },
    { id: 3, embedId: 'y2g4CDlOdaE' },
    { id: 4, embedId: 'rs1W8kfQc3U' },
    { id: 5, embedId: '3QH6Mb01Pys' },
    { id: 6, embedId: 'YSSWOh-tGDY' },
    { id: 7, embedId: 'Hp4rRrbfCc4' },
    { id: 8, embedId: 'uhQRvUxN4CQ' },
    { id: 9, embedId: 'OO5Q69P96_s' },
    { id: 10, embedId: 'SOXuGjtI_xE' },
    { id: 11, embedId: 'gZbAiU8XiHw' },
    { id: 12, embedId: 'T09VEdyk6cs' },
    { id: 13, embedId: 'JStQ1LLcuIQ' },
    { id: 14, embedId: 'iMf15-OTAso' },
    { id: 15, embedId: '57cDQR2e3EQ' },
    { id: 16, embedId: 'UWlhtghyUEM' },
    { id: 17, embedId: 'f_FYTIQvgAo' },
    { id: 18, embedId: 'V-qxYwqL-JU' },
    { id: 19, embedId: 'zEgedLoott0' },
    { id: 20, embedId: '7wM4n8rU2Ck' },
    { id: 21, embedId: '_H4sRIKE8CY' },
    { id: 22, embedId: 'rT-yxZx9CL0' },
    { id: 23, embedId: 'v6VDPsn9Pno' },
    { id: 24, embedId: 'XTENqnPqPnM' },
    { id: 25, embedId: 'pjDQN3riSKg' },
    { id: 26, embedId: 'FEWtKB5wz1Q' },
    { id: 27, embedId: 'zewVH_e9kek' },
    { id: 28, embedId: 'iTpstvVWhGg' },
    { id: 29, embedId: 'KaukPra3j_s' },
    { id: 30, embedId: 'piYJJ9miEjE' },
    { id: 31, embedId: '103KG7ZVHm0' },
  ];

  return (
    <div className="flex flex-wrap items-start justify-around gap-x-6 mt-4">
      {[...youtubeEmbedIds].map((youtubeEmbedId) => (
        <iframe
          key={youtubeEmbedId.id}
          title="YouTube video player"
          allow="accelerometer autoplay clipboard-write encrypted-media gyroscope"
          allowFullScreen
          className="rounded-lg duration-1000 mt-6 hover:opacity-80 max-2xl:flex-grow max-sm:flex-col"
          src={`https://www.youtube.com/embed/103KG7ZVHm0`}
          width={400}
          height={230}
        ></iframe>
      ))}
    </div>
  );
};

export default YTVideos;
