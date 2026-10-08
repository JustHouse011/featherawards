import type { ButtonHTMLAttributes } from 'react';
import { ArrowRight } from 'lucide-react';
type Props = ButtonHTMLAttributes<HTMLButtonElement> & { quiet?: boolean; arrow?: boolean };
export function CrystalButton({ children, quiet = false, arrow = true, className = '', ...props }: Props) {
  return <button {...props} className={`crystal-button ${quiet ? 'crystal-button--quiet' : ''} ${className}`}><span>{children}{arrow && <ArrowRight size={22} strokeWidth={1} aria-hidden="true" />}</span></button>;
}
