import { FuzzyText } from './components';

const NotFoundPage = () => {
  return (
    <div className="min-h-[100svh] flex flex-col items-center justify-center gap-16">
      <FuzzyText baseIntensity={0.2} hoverIntensity={0.5} enableHover={true}>
        404 - Not Found
      </FuzzyText>
      Button
    </div>
  );
};

export default NotFoundPage;
