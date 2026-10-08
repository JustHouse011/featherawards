import { useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { EventDetails } from './components/EventDetails';
import { RSVPForm } from './components/RSVPForm';
import { SignatureSection } from './components/SignatureSection';
import { PartnersCarousel } from './components/PartnersCarousel';
import { Footer } from './components/Footer';
export default function App() {
  const [response, setResponse] = useState<{ attending: boolean; request: number } | null>(null);
  function respond(attending: boolean) { setResponse({ attending, request: Date.now() }); document.getElementById('rsvp')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
  return <MotionConfig reducedMotion="user"><a className="skip-link" href="#rsvp">Skip to RSVP</a><Navbar/><main><Hero onRespond={respond}/><EventDetails/><RSVPForm response={response}/><PartnersCarousel/><SignatureSection/></main><Footer/></MotionConfig>;
}
