interface LogoProps {
  size?: number;
  withText?: boolean;
  className?: string;
}

export const Logo = ({ size = 28, withText = true, className = '' }: LogoProps) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0071e3" />
          <stop offset="1" stopColor="#0066cc" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#ffffff" stroke="url(#logo-grad)" strokeWidth="2" />
      <circle cx="32" cy="32" r="13" stroke="url(#logo-grad)" strokeWidth="3" fill="none" />
      <circle cx="32" cy="32" r="3" fill="url(#logo-grad)" />
      <path d="M32 22 L32 32 M22 32 L32 32 M32 32 L42 32" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
    </svg>
    {withText && (
      <span className="font-display tracking-tight text-ink text-body-lg font-semibold">
        Focus<span className="bg-gradient-to-br from-azure to-cobalt-link bg-clip-text text-transparent">Hub</span>
      </span>
    )}
  </div>
);
