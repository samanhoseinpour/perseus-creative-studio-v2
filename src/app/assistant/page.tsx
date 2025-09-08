"use client";

import { AssistantHero, AssistantBackground } from "../components";

const AssistantPage = () => {
  return (
    <main className="relative min-h-[100svh] overflow-hidden flex justify-center items-center">
      <div className="absolute inset-0 z-0">
        <AssistantBackground
          animationType="rotate3d"
          intensity={2}
          speed={0.5}
          distort={1.0}
          paused={false}
          offset={{ x: 0, y: 0 }}
          hoverDampness={0.25}
          rayCount={24}
          mixBlendMode="lighten"
          colors={["#ff007a", "#4d3dff", "#ffffff"]}
        />
      </div>

      <div className="relative z-10">
        <AssistantHero />
      </div>
    </main>
  );
};

export default AssistantPage;
