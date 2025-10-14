interface ProjectTitle {
  title: string;
}
const PorjectTitle = ({ title }: ProjectTitle) => {
  return (
    <div className="flex justify-center my-40">
      <h1 className="text-[7.5vw] uppercase text-center leading-none">
        {title}
      </h1>
    </div>
  );
};

export default PorjectTitle;
