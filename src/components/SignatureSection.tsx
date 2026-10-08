import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
export function SignatureSection() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], [-6, 6]);
  return <section ref={ref} id="dress-code" className="signature-section" aria-labelledby="signature-heading"><motion.img style={{ y: reduced ? 0 : imageY }} src="/assets/campaign.webp" alt="Fashion portrait with pink crystal earrings and sculptural rose organza" width="1024" height="1536" loading="lazy"/><div className="signature-crystal" aria-hidden="true"/><motion.div className="signature-copy" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ duration: reduced ? 0 : 1 }}><p className="eyebrow">FEATHER AWARDS XVIII</p><h2 id="signature-heading">MAKE A<br/>SIGNATURE<br/><span>STATEMENT.</span></h2><p className="campaign-values">FASHION <b>|</b> IDENTITY <b>|</b> EXCELLENCE <b>|</b> IMPACT</p></motion.div></section>;
}
