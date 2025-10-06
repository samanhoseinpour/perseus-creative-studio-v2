"use client";
import { useState, type ReactNode, type ComponentProps } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";

interface CustomCardProps {
  tintColor?: string;
  title: ReactNode | string;
  description?: string;
  detailContent?: string;
  children?: ReactNode;
  mainCustomStyle?: string;
  headingStyle?: string;
}

const CustomCard = ({
  tintColor = "#000000",
  title,
  description = "",
  detailContent = "",
  children,
  mainCustomStyle = "",
  headingStyle = "",
  ...props
}: CustomCardProps) => {
  const [showDetail, setShowDetail] = useState(false);
  const hasDetail = !!detailContent && detailContent.length > 0;

  const animationVariants: Variants = {
    main: {
      color: tintColor,
      transition: { delay: 0.5 },
    },
    detail: { color: "#000" },
  };

  return (
    <motion.div
      className={`relative h-[550px] max-sm:h-[400px] rounded-xl bg-background-contrast px-8 pt-8 overflow-hidden flex-col gap-2 ${mainCustomStyle}`}
      {...props}
      initial={false}
      animate={showDetail ? "detail" : "main"}
    >
      <motion.h2
        className={`relative text-xl leading-xl sm:text-2xl sm:leading-2xl font-semibold z-50 text-white ${headingStyle}`}
        variants={animationVariants}
      >
        {title}
      </motion.h2>
      <p className="text-xs leading-xs text-white/70">{description}</p>
      <>{children}</>
      {hasDetail && <ToggleButton onClick={() => setShowDetail(!showDetail)} />}
      <AnimatePresence>
        {showDetail && (
          <DetailContainer tintColor={tintColor} content={detailContent} />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface DetailContainerProps {
  tintColor: string;
  content: string;
}

const DetailContainer = ({ tintColor, content }: DetailContainerProps) => {
  const animationVariants: { container: Variants; content: Variants } = {
    container: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0, transition: { delay: 0.5 } },
    },
    content: {
      initial: { y: -100, opacity: 0 },
      animate: { y: 0, opacity: 1, transition: { delay: 0.5, bounce: 0 } },
      exit: { y: -100, opacity: 0 },
    },
  };

  return (
    <motion.div
      className="bg-background-contrast-white text-black absolute inset-0 flex justify-start items-center p-8"
      variants={animationVariants["container"]}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.p
        className="text-sm max-w-[80ch] text-black"
        style={{ backgroundColor: tintColor }}
        variants={animationVariants["content"]}
      >
        {content}
      </motion.p>
    </motion.div>
  );
};

type ToggleButtonProps = ComponentProps<typeof motion.button>;

const ToggleButton = ({ ...props }: ToggleButtonProps) => {
  const animationVariants: Variants = {
    main: {
      rotate: 0,
    },
    detail: { rotate: 45 },
  };

  return (
    <motion.button
      className="absolute right-8 bottom-8 size-10 rounded-full cursor-pointer flex justify-center items-center z-50 bg-white"
      {...props}
      variants={animationVariants}
      transition={{ bounce: 0 }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 9a.75.75 0 0 0-1.5 0v2.25H9a.75.75 0 0 0 0 1.5h2.25V15a.75.75 0 0 0 1.5 0v-2.25H15a.75.75 0 0 0 0-1.5h-2.25V9Z"
          clipRule="evenodd"
        />
      </svg>
    </motion.button>
  );
};

export default CustomCard;
