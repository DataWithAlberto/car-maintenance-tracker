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
          <stop offset="0" stopColor="#4d82ff" />
          <stop offset="0.55" stopColor="#2563eb" />
          <stop offset="1" stopColor="#a3e012" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0b1220" stroke="url(#logo-grad)" strokeWidth="2" />
      <circle cx="32" cy="32" r="13" stroke="url(#logo-grad)" strokeWidth="3" fill="none" />
      <circle cx="32" cy="32" r="3" fill="url(#logo-grad)" />
      <path d="M32 22 L32 32 M22 32 L32 32 M32 32 L42 32" stroke="url(#logo-grad)" strokeWidth="3" strokeLinecap="round" />
    </svg>
    {withText && (
      <span className="font-bold tracking-tight text-white text-lg">
        Focus<span className="bg-gradient-to-br from-brand-300 via-brand-500 to-accent-500 bg-clip-text text-transparent">Hub</span>
      </span>
    )}
  </div>
);
