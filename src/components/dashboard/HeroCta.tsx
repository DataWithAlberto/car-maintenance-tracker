import type { ComponentType, SVGProps } from 'react';

export interface HeroCtaProps {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>;
  onClick: () => void;
}

// Dark pill CTA used in the hero. Owns its focus style for visibility
// against the indigo gradient (white halo via .focus-on-dark).
export const HeroCta = ({ label, icon: Icon, onClick }: HeroCtaProps) => (
  <button
    type="button"
    className="pill-dark focus-on-dark"
    onClick={onClick}
    aria-label={label}
    style={{ background: '#000', color: '#fff' }}
  >
    <Icon size={14} strokeWidth={2.2} aria-hidden="true" />
    {label}
  </button>
);
