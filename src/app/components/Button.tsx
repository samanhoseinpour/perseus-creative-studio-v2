import { twMerge } from 'tailwind-merge';
import React from 'react';

interface CustomButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'small' | 'medium' | 'large';
}

const CustomButton = React.forwardRef<HTMLButtonElement, CustomButtonProps>(
  ({ children, className, size = 'medium', ...rest }, ref) => {
    const sizeClassNames = {
      small: 'text-xs px-3 py-2',
      medium: 'text-sm px-5 py-3',
      large: 'text-lg px-8 py-4',
    };

    return (
      <button
        ref={ref}
        className={twMerge(
          'bg-white text-black border-1 border-white rounded-full px-3 py-1 cursor-pointer duration-500 hover:bg-transparent hover:backdrop-blur-2xl hover:text-white',
          sizeClassNames[size],
          className
        )}
        {...rest}
      >
        {children}
      </button>
    );
  }
);

CustomButton.displayName = 'CustomButton';

export default CustomButton;
