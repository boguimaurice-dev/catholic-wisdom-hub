import { useId } from "react";

export function BrandMark({ size = 44 }: { size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bg = `bg-${id}`;
  const fg = `fg-${id}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="Coffre"
      className="brand-mark"
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#123b34" />
          <stop offset="0.55" stopColor="#0b161c" />
          <stop offset="1" stopColor="#070a0f" />
        </linearGradient>
        <linearGradient id={fg} x1="0.2" y1="0" x2="0.85" y2="1">
          <stop offset="0" stopColor="#6df3cd" />
          <stop offset="1" stopColor="#14b8a6" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill={`url(#${bg})`} />
      <path
        d="M256 92l122 44v112c0 82-50 141-122 176-72-35-122-94-122-176V136l122-44z"
        fill="none"
        stroke={`url(#${fg})`}
        strokeWidth="24"
        strokeLinejoin="round"
      />
      <circle cx="256" cy="232" r="34" fill={`url(#${fg})`} />
      <rect x="243" y="248" width="26" height="78" rx="13" fill={`url(#${fg})`} />
    </svg>
  );
}

export function Brand({ size = 40, tagline }: { size?: number; tagline?: string }) {
  return (
    <div className="brand">
      <BrandMark size={size} />
      <div className="brand__text">
        <span className="brand__name">Coffre</span>
        {tagline ? <span className="brand__tagline">{tagline}</span> : null}
      </div>
    </div>
  );
}
