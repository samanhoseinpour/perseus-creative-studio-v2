'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

import { cn } from '@/lib/utils';

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
      material.uniforms.u_time.value = state.clock.elapsedTime;
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

const Shader4 = ({
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
    uniform float u_aberration;

    float lightImpulses(vec2 v, float time) {
        float streak = 0.0;

        for (int j = 0; j < 4; j++) {
            float seed = float(j) * 1.37;
            float phase = dot(v, normalize(vec2(sin(seed*12.3), cos(seed*4.7))));
            float speed = 0.4 + fract(sin(seed*77.7)*43758.5);

            float pulse = exp(-30.0 * pow(fract(phase*0.2 + time*speed) - 0.5, 2.0));

            streak += pulse;
        }

        return streak;
    }

    vec4 getScene(vec2 fragCoord, vec2 resolution) {
        float i = .13, a;
        vec2 r = resolution;

        vec2 p = (fragCoord+fragCoord - r) / r.y / .9;
        vec2 d = vec2(-1,1);
        vec2 b = p - i*d;
        vec2 c = p * mat2(1, 1, d/(.1 + i/dot(b,b)));
        vec2 v = c * mat2(cos(.5*log(a=dot(c,c))))/i;
        vec2 w = vec2(0.0);

        for(; i++<9.; w += 1.1+sin(v))
            v += 0.9* sin(v.yx/i+u_time) / i + .3;

        i = length(5.0);

        vec4 base = 0.9 - exp( -exp( c.x * vec4(0.0,0.0,0,0) )
                       /  vec4(length(w))
                       / ( 2. + i*i/4. - i )
                       / ( .5 + 1. / a )
                       / ( .03 + abs( length(p)-.7 ) )
                 );

        float streak = lightImpulses(v, u_time);
        base.rgb += streak * 0.015;

        return base;
    }

    void mainImage(out vec4 fragColor, in vec2 fragCoord)
    {
        vec2 r = u_resolution.xy;
        vec2 uv = fragCoord / r;

        float u_aberration = 10.0;
        float ChromaticAberration = u_aberration;
        vec2 texel = 1.0 / r;
        vec2 coords = (uv - 0.5) * 2.0;
        float coordDot = dot(coords, coords);
        vec2 precompute = ChromaticAberration * coordDot * coords;

        vec2 uvR = uv - texel * precompute;
        vec2 uvB = uv + texel * precompute;

        vec2 fragCoordR = uvR * r;
        vec2 fragCoordB = uvB * r;

        vec4 colR = getScene(fragCoordR, r);
        vec4 colG = getScene(fragCoord , r);
        vec4 colB = getScene(fragCoordB, r);

        fragColor = vec4(colR.r, colG.g, colB.b, 1.0);
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
    <section
      className={cn(
        className,
        'absolute inset-0 w-full h-screen bg-neutral-950',
      )}
    >
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

export { Shader4 };
