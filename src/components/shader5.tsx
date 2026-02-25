"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { cn } from "@/lib/utils";

interface ShaderPlaneProps {
  vertexShader: string;
  fragmentShader: string;
  uniforms: { [key: string]: { value: unknown } };
}

const ShaderPlane = ({
  vertexShader,
  fragmentShader,
  uniforms,
}: ShaderPlaneProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.u_time.value = state.clock.elapsedTime * 0.5;
      material.uniforms.u_resolution.value.set(size.width, size.height, 1.0);
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.FrontSide}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
};

interface ShaderBackgroundProps {
  vertexShader?: string;
  fragmentShader?: string;
  uniforms?: { [key: string]: { value: unknown } };
  className?: string;
}

const Shader5 = ({
  vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
    gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader = `
    precision highp float;

    varying vec2 vUv;
    uniform float u_time;
    uniform vec3 u_resolution;

    #define T           u_time + 50.
    #define P(z)        vec3(0.0, 0.0, 0.)
    #define rot(a)      mat2(cos(a + vec4(0, 33, 11, 0)))

    float sphere(vec3 p, vec3 center, float radius) {
        return length(p - center) - radius;
    }

    float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    float interleavedGradientNoise(vec2 pixel) {
        pixel = floor(pixel);
        const vec2 magic = vec2(0.06711056, 0.00583715);
        return fract(52.9829189 * fract(dot(pixel, magic)));
    }

    float BlueNoise(vec2 p, float time) {
        float ig = interleavedGradientNoise(p);
        float jitter = hash12(p + time);
        return fract(ig + jitter * 0.5);
    }

    void mainImage(out vec4 fragColor, in vec2 u) {
        float s = 0.001;
        float d = 0.0;
        float i = 0.0;

        vec3 r = u_resolution;
        vec3 ro = P(T);
        vec3 p = ro;
        vec3 Z = normalize(P(T + 1.0) - p);
        vec3 D = vec3((u - r.xy * 0.5) / r.y, 1.0) * 0.5;

        vec4 o = vec4(0.0);

        for (; i++ < 100.0 && s > 0.0001;) {
            p = ro + D * d;
            p.xy *= rot(-p.z * 0.5 + sin(u_time * 0.5));
            p.z += u_time;

            float gyroidDist = length(p.xy - P(p.z).xy) - 0.5 + sin(u_time * 1.5) * 0.1 - 1.0 + sin(p.z * 0.1) * 0.2;

            vec3 sphereCenter = vec3(0.0, 0., 3.+u_time);
            float noise = sin(p.x * 3.1 + u_time) * 0.1 + 
                          sin(p.y * 2.7 - u_time * 0.8) * 0.05;

            float radius = 1.0 + noise * 0.3;
            float sphereDist = sphere(p, sphereCenter, radius);

            float sceneDist = min(-gyroidDist, sphereDist);
            s = abs(sceneDist);

            d += s;

            float fade = smoothstep(0.0001, 0.01, s);

            vec3 base = sin(p * 3.0 + u_time) * 0.5 + 0.75;
            vec3 neon = pow(base, vec3(4.0));
            neon *= vec3(0.2, 0.8, 1.2);
            o.rgb += neon * fade * 5.5;
        }

        o.rgb = o.rgb * exp(-d * 1.0);
        o.rgb = pow(o.rgb, vec3(1.0 / 25.0));

        float dither = BlueNoise(u, u_time * 0.5) - 0.5;
        o.rgb += dither * (1.0/255.0);

        o.rgb = clamp(o.rgb, 0.0, 1.0);

        fragColor = vec4(o.rgb, 1.0);
    }

    void main() {
        vec4 fragColor;
        vec2 fragCoord = vUv * u_resolution.xy;
        mainImage(fragColor, fragCoord);
        gl_FragColor = fragColor;
    }
`,
  uniforms = {},
  className,
}: ShaderBackgroundProps) => {
  const shaderUniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector3(1, 1, 1) },
      ...uniforms,
    }),
    [uniforms],
  );

  return (
    <section className={cn(className, "absolute inset-0 w-full h-screen")}>
      <Canvas>
        <ShaderPlane
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={shaderUniforms}
        />
      </Canvas>
    </section>
  );
};

export { Shader5 };
