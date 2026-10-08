import { useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
export function GlassPanel({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [10, -10]);
  return <div ref={ref} className="glass-panel"><motion.div className="panel-crystals" style={{ y: reduced ? 0 : y }} aria-hidden="true"><i/><i/><i/><i/></motion.div><div className="panel-content">{children}</div></div>;
}
