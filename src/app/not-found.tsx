import { NotFoundComp } from './components';

export const metadata = {
  title: 'Page Not Found - Perseus Creative Studio',
  description: 'The page you are looking for does not exist.',
};

const NotFoundPage = () => {
  return <NotFoundComp title="page" route="Home" />;
};

export default NotFoundPage;
