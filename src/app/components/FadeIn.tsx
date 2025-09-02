"use client";

import { motion } from "framer-motion";

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
}

const FadeIn = ({ children, duration = 1 }: FadeInProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 0.7, y: 0 }}
      transition={{ duration: duration, ease: "easeOut" }}
      viewport={{ margin: "100% 0px -300px 0px" }}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;
