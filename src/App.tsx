import { MotionConfig } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { EventDetails } from './components/EventDetails';
import { RSVPForm } from './components/RSVPForm';
import { SignatureSection } from './components/SignatureSection';
import { PartnersCarousel } from './components/PartnersCarousel';
import { Footer } from './components/Footer';
export default function App() {
  function showRSVPStatus() { document.getElementById('rsvp')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
  return <MotionConfig reducedMotion="user"><a className="skip-link" href="#rsvp">RSVP status</a><Navbar/><main><Hero onRespond={showRSVPStatus}/><EventDetails/><RSVPForm/><PartnersCarousel/><SignatureSection/></main><Footer/></MotionConfig>;
}
