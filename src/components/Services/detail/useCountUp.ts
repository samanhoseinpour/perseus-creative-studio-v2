'use client';

import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/**
 * Matches a value that *starts* with a number (after an optional sign / currency
 * symbol) so we only count up genuine figures. "12.4k" / "+182%" / "$3.2M" match;
 * "Top 3" / "Award-winning" do not (letters before the digits → no match).
 */
const PARSE = /^([+\-]?[$€£]?)\s?([\d,]*\.?\d+)(.*)$/;
const EASE = [0.22, 1, 0.36, 1] as const;

const decimalsOf = (raw: string) =>
  raw.includes('.') ? raw.split('.')[1].length : 0;

/**
 * Animates a numeric string from zero to its authored value on mount, preserving
 * the prefix (sign/currency), decimal places, thousands separators, and suffix
 * ("k", "%", "×"…). Values that don't start with a number are returned verbatim,
 * and the whole effect is skipped under `prefers-reduced-motion` — so authored
 * content like "Top 3" always renders correctly.
 */
export function useCountUp(value: string, duration = 1.1): string {
  const reduce = useReducedMotion();
  const m = value.match(PARSE);
  const animatable = !!m && !reduce;

  // SSR / first paint: zeroed figure when we'll animate (else the raw value is
  // returned directly below, so the effect never sets state synchronously).
  const initial = animatable ? `${m![1]}${(0).toFixed(decimalsOf(m![2]))}${m![3]}` : value;
  const [display, setDisplay] = useState(initial);

  useEffect(() => {
    if (!animatable) return;
    const [, prefix, rawNum, suffix] = value.match(PARSE)!;
    const hasComma = rawNum.includes(',');
    const decimals = decimalsOf(rawNum);
    const target = parseFloat(rawNum.replace(/,/g, ''));

    const controls = animate(0, target, {
      duration,
      ease: EASE,
      onUpdate: (v) => {
        const fixed = v.toFixed(decimals);
        const out = hasComma
          ? Number(fixed).toLocaleString('en-US', {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
            })
          : fixed;
        setDisplay(`${prefix}${out}${suffix}`);
      },
    });

    return () => controls.stop();
  }, [value, animatable, duration]);

  return animatable ? display : value;
}
