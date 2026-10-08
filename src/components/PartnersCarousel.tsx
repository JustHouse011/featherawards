import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import logo1 from '../Assets/images/1.png';
import logo2 from '../Assets/images/2.png';
import logo3 from '../Assets/images/3.png';
import logo4 from '../Assets/images/4.png';
import logo5 from '../Assets/images/5.png';
import logo6 from '../Assets/images/6.png';
import '../styles/partners.css';

const partners = [
  { src: logo1, alt: 'Love equals Ally logo' },
  { src: logo2, alt: 'MAC logo' },
  { src: logo3, alt: 'Tutone Communications logo' },
  { src: logo4, alt: 'Multicoloured fingerprint partner logo' },
  { src: logo5, alt: 'Thami Dish Foundation logo' },
  { src: logo6, alt: 'Proudly South African logo' },
];

export function PartnersCarousel() {
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();
  const entrance = { opacity: 0, y: reducedMotion ? 0 : 18 };
  return <section className="partners-section" aria-labelledby="partners-heading">
    <motion.p className="eyebrow" initial={entrance} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .55 }}>FEATHER AWARDS XVIII</motion.p>
    <motion.h2 id="partners-heading" initial={entrance} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .6, delay: .1 }}>OUR PARTNERS</motion.h2>
    <motion.div className={`partners-viewport${ready ? ' marquee-ready' : ''}`} tabIndex={0} role="region" aria-label="Partner logos; focus to pause movement" initial={entrance} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .7, delay: .2 }} onAnimationComplete={() => setReady(true)}>
      <div className="partners-track">
        {[0, 1].map(sequence => <ul className="partners-sequence" key={sequence} aria-hidden={sequence === 1 ? true : undefined}>
          {partners.map(partner => <li className="partner-card" key={`${sequence}-${partner.src}`}><div className="logo-image-wrapper"><img src={partner.src} alt={sequence === 1 ? '' : partner.alt} decoding="async" /></div></li>)}
        </ul>)}
      </div>
    </motion.div>
  </section>;
}
