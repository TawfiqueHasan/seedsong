/** the Seedsong mark: a tiny recursive Y-branch */
export function Glyph({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <g stroke="var(--accent)" strokeLinecap="round">
        <path d="M32 58V38" strokeWidth="3.4" />
        <path d="M32 38 20 26M32 38l12-12" strokeWidth="2.8" />
        <path d="M20 26l-7-8M20 26l2-11M44 26l7-8M44 26l-2-11" strokeWidth="2" stroke="var(--accent-2)" />
      </g>
      <g fill="var(--accent)">
        <circle cx="13" cy="17" r="2.6" />
        <circle cx="22" cy="14" r="2.6" />
        <circle cx="51" cy="17" r="2.6" />
        <circle cx="42" cy="14" r="2.6" />
      </g>
    </svg>
  );
}

/** a seed with a sprouting line, for the landing ritual */
export function SeedGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <radialGradient id="seed-g" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.95" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="58" r="40" fill="url(#seed-g)" opacity="0.5" />
      <ellipse cx="50" cy="62" rx="11" ry="14" fill="var(--accent)" opacity="0.9" />
      <path d="M50 49c0-10 4-16 11-20M50 49c0-7-3-12-9-14" stroke="var(--accent-2)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
