import { motion, useReducedMotion } from 'framer-motion';
import { GlassPanel } from './GlassPanel';

export function RSVPForm() {
  const reduced = useReducedMotion();
  return <motion.section id="rsvp" className="rsvp-section" aria-labelledby="rsvp-heading" initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .1 }} transition={{ duration: reduced ? 0 : .8 }}>
    <GlassPanel>
      <div className="rsvp-closed">
        <h2 id="rsvp-heading">RSVP REGISTRATION CLOSED</h2>
        <h3>THANK YOU FOR YOUR INTEREST</h3>
        <p>Registration for the Feather Awards 2026 is now officially closed.</p>
        <p>We sincerely thank everyone who confirmed their attendance and look forward to celebrating an unforgettable evening with you.</p>
        <p className="rsvp-closed__event">SEE YOU ON 05 NOVEMBER 2026</p>
        <p className="rsvp-closed__team">The Feather Awards Team</p>
      </div>
    </GlassPanel>
  </motion.section>;
}
