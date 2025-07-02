export type Movie = {
  poster: string;
  name: string;
};

export const movies = [
  { poster: '/tv-1.mp4/ik-video.mp4', name: 'Airplane' },
  {
    poster: '/production-hero.mp4/ik-video.mp4',
    name: 'Family man',
  },
  {
    poster: '/tv-1.mp4/ik-video.mp4',
    name: 'Laboratory',
  },
  { poster: '/production-hero.mp4/ik-video.mp4', name: 'Napoleon' },
  {
    poster: '/tv-1.mp4/ik-video.mp4',
    name: 'Person in Darkness',
  },
  {
    poster: '/production-hero.mp4/ik-video.mp4',
    name: 'Scary Building',
  },
  { poster: '/tv-1.mp4/ik-video.mp4', name: 'Stars' },
];

export const randomMoviesSet1 = movies
  .sort(() => Math.random() - 0.5)
  .concat(movies.sort(() => Math.random() - 0.5))
  .concat(movies.sort(() => Math.random() - 0.5));

export const randomMoviesSet2 = movies
  .sort(() => Math.random() - 0.5)
  .concat(movies.sort(() => Math.random() - 0.5))
  .concat(movies.sort(() => Math.random() - 0.5))
  .sort(() => Math.random() - 0.5);
