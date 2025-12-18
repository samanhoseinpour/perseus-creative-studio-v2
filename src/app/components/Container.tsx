import { twMerge } from 'tailwind-merge';

import { ContainerProps } from '../utils/types';

const Container = ({ children, className }: ContainerProps) => {
  return (
    <div
      className={twMerge(`container mx-auto px-6 max-w-[1240px] ${className}`)}
    >
      {children}
    </div>
  );
};

export default Container;
