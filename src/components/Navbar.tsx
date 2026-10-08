import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
const links = [{label:'ABOUT', target:'about'}, {label:'THE EVENT', target:'event'}, {label:'DRESS CODE', target:'dress-code'}, {label:'RSVP', target:'rsvp'}];
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { const update = () => setScrolled(window.scrollY > 40); update(); window.addEventListener('scroll', update, { passive: true }); return () => window.removeEventListener('scroll', update); }, []);
  useEffect(() => { const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close); }, []);
  return <header className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}><a className="wordmark wordmark--image" href="#about" aria-label="Feather Awards XVIII home"><img src="/assets/logo.png" width="495" height="342" alt="Feather Awards XVIII"/></a><button className="menu-toggle" aria-label={open ? 'Close navigation' : 'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button><nav id="main-navigation" aria-label="Main navigation" className={open ? 'nav-open' : ''}>{links.map(link => <a key={link.target} href={`#${link.target}`} className={link.target === 'rsvp' ? 'nav-rsvp' : ''} onClick={() => setOpen(false)}>{link.label}</a>)}</nav></header>;
}

