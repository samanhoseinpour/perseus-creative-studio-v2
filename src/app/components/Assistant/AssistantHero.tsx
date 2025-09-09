import { AssistantInput } from "../";

const AssistantHero = () => {
  const placeholders = [
    "What services does Perseus offer?",
    "How can Perseus help scale my business?",
    "Does Perseus provide custom AI solutions?",
    "What industries does Perseus specialize in?",
    "How do I get started with Perseus services?",
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("submitted");
  };
  return (
    <div className="h-[40rem] flex flex-col justify-center  items-center px-4">
      <h1 className="mb-10 text-xl text-center sm:text-5xl font-bold">
        Ask PERSEUS AI Anything.
      </h1>
      <AssistantInput
        placeholders={placeholders}
        onChange={handleChange}
        onSubmit={onSubmit}
      />
    </div>
  );
};

export default AssistantHero;
