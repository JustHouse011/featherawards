import { motion, useReducedMotion } from 'framer-motion';

/** Decorative layers never contribute to the heading's layout or accessible name. */
export function HeroTitleEffects() {
  const reduced = useReducedMotion();
  const entrance = (delay: number) => ({ initial: { opacity: reduced ? 1 : 0, y: reduced ? 0 : 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduced ? 0 : .85, delay: reduced ? 0 : delay } });
  const draw = (delay: number) => ({ initial: { pathLength: reduced ? 1 : 0 }, animate: { pathLength: 1 }, transition: { duration: reduced ? 0 : 1.3, delay: reduced ? 0 : delay, ease: 'easeInOut' as const } });
  return <h1 id="hero-heading" className="pearl-title">
    <motion.span {...entrance(.25)} className="pearl-title-line" data-word="SIGNATURE">SIGNATURE
      <svg className="pearl-curve pearl-curve--upper" viewBox="0 0 1000 90" aria-hidden="true" focusable="false"><defs><linearGradient id="hero-upper-reflection"><stop stopColor="#fffafb"/><stop offset=".6" stopColor="#f3bfd5"/><stop offset="1" stopColor="#d982ad"/></linearGradient></defs><motion.path {...draw(.5)} d="M43 66 C64 33 104 26 161 35 C282 55 389 12 543 28 C617 36 666 43 695 33" stroke="url(#hero-upper-reflection)" strokeWidth=".9" strokeLinecap="round" fill="none"/></svg>
      <i className="pearl-glint pearl-glint--a" aria-hidden="true"/><i className="pearl-glint pearl-glint--b" aria-hidden="true"/>
    </motion.span>
    <motion.span {...entrance(.4)} className="pearl-title-line" data-word="STATEMENT?">STATEMENT?
      <svg className="pearl-curve pearl-curve--lower" viewBox="0 0 1000 90" aria-hidden="true" focusable="false"><defs><linearGradient id="hero-lower-reflection"><stop stopColor="#fffafb"/><stop offset=".6" stopColor="#f3bfd5"/><stop offset="1" stopColor="#d982ad"/></linearGradient></defs><motion.path {...draw(.7)} className="pearl-travel-path" d="M541 17 C563 44 615 55 693 40 C781 23 818 63 907 37" stroke="url(#hero-lower-reflection)" strokeWidth=".9" strokeLinecap="round" fill="none"/><circle className="pearl-travelling-light" r="1.7" fill="#fffafb">{!reduced && <animateMotion dur="11s" repeatCount="indefinite" keyTimes="0;.60;.76;1" keyPoints="0;0;1;1" calcMode="linear" path="M541 17 C563 44 615 55 693 40 C781 23 818 63 907 37"/>}</circle></svg>
      <i className="pearl-glint pearl-glint--c" aria-hidden="true"/><i className="pearl-glint pearl-glint--d" aria-hidden="true"/>
    </motion.span>
  </h1>;
}
