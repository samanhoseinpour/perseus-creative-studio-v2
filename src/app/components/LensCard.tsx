import { ImageKit, Lens, Button } from "./";
import Link from "next/link";

interface LensCardProps {
  title: string;
  desc: string;
  img: string;
}

const LensCard = ({ title, desc, img }: LensCardProps) => {
  return (
    <div>
      <Lens>
        <div className="w-full relative rounded-3xl overflow-hidden max-w-md mx-auto bg-background p-8 mb-2">
          <div className="relative z-10">
            <ImageKit
              src={img}
              alt="image"
              width={500}
              height={500}
              className="rounded-2xl"
            />

            <div className="flex flex-col items-start justify-evenly py-4 relative z-20">
              <h2 className="text-white text-lg leading-lg sm:text-xl sm:leading-xl  text-left font-bold">
                {title}
              </h2>
              <p className="text-white/70 font-semibold text-sm mt-2">{desc}</p>
              <Link href="/contact" className="w-full">
                <Button size="small" className="mt-4 w-full">
                  Read More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Lens>
    </div>
  );
};

export default LensCard;
