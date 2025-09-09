import { TextEffect } from "@/app/components";

interface ProjectTitle {
  title: string;
}
const PorjectTitle = ({ title }: ProjectTitle) => {
  return (
    <div className="flex justify-center my-40">
      <TextEffect className="text-[7.5vw] uppercase text-center leading-none">
        {title}
      </TextEffect>
    </div>
  );
};

export default PorjectTitle;
