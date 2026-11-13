export function LoginArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 340"
      className={className}
      role="img"
      aria-label="Ilustração de um casal segurando o bebê recém-nascido em casa"
    >
      <circle cx="210" cy="178" r="146" fill="hsl(var(--lavender))" opacity="0.45" />
      <circle cx="352" cy="74" r="30" fill="hsl(var(--sun))" />
      <circle cx="64" cy="116" r="20" fill="hsl(var(--mint))" />
      <circle cx="96" cy="60" r="7" fill="hsl(var(--primary))" opacity="0.5" />
      <circle cx="352" cy="176" r="9" fill="hsl(var(--primary))" opacity="0.35" />
      <ellipse cx="210" cy="308" rx="146" ry="14" fill="hsl(20 30% 40%)" opacity="0.08" />

      <path d="M340 168c-9-6-18-12-18-21a9 9 0 0 1 18-4 9 9 0 0 1 18 4c0 9-9 15-18 21z" fill="hsl(var(--primary))" opacity="0.55" />

      {/* corpo do adulto à esquerda */}
      <path d="M92 306c0-47 30-76 66-76s66 29 66 76z" fill="hsl(var(--primary))" />
      {/* corpo do adulto à direita */}
      <path d="M214 306c0-42 27-68 62-68s62 26 62 68z" fill="hsl(266 45% 78%)" />

      {/* braços acolhendo */}
      <path
        d="M124 240c6 28 34 48 64 49"
        stroke="hsl(13 60% 60%)"
        strokeWidth="17"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M318 248c-10 24-36 41-66 42"
        stroke="hsl(266 38% 72%)"
        strokeWidth="17"
        strokeLinecap="round"
        fill="none"
      />

      {/* bebê enrolado no paninho */}
      <ellipse cx="214" cy="256" rx="52" ry="31" fill="hsl(36 78% 95%)" />
      <path
        d="M166 252c14 9 31 13 48 13s33-4 46-12"
        stroke="hsl(var(--primary))"
        strokeOpacity="0.35"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="252" cy="234" r="17" fill="hsl(28 62% 88%)" />
      <path
        d="M244 231a4 4 0 0 1 5 0M256 231a4 4 0 0 1 5 0"
        stroke="hsl(20 30% 32%)"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M249 239c2 2 5 2 7 0"
        stroke="hsl(20 30% 32%)"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />

      {/* cabeças */}
      <circle cx="158" cy="192" r="30" fill="hsl(28 62% 88%)" />
      <path d="M128 192a30 30 0 0 1 60 0c-8-14-18-20-30-20s-22 6-30 20z" fill="hsl(20 32% 30%)" />

      <circle cx="276" cy="204" r="27" fill="hsl(30 55% 84%)" />
      <path d="M249 205a27 27 0 0 1 54 0c-8-13-17-18-27-18s-19 5-27 18z" fill="hsl(24 34% 34%)" />
    </svg>
  );
}

export function FamilyEmptyArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 210"
      className={className}
      role="img"
      aria-label="Ilustração de uma pequena família reunida"
    >
      <circle cx="160" cy="108" r="88" fill="hsl(var(--mint))" opacity="0.4" />
      <ellipse cx="160" cy="188" rx="96" ry="10" fill="hsl(20 30% 40%)" opacity="0.08" />

      <rect x="52" y="52" width="10" height="10" rx="3" fill="hsl(var(--primary))" opacity="0.55" transform="rotate(-18 57 57)" />
      <rect x="252" y="74" width="9" height="9" rx="3" fill="hsl(var(--lavender))" transform="rotate(24 256 78)" />
      <rect x="236" y="34" width="7" height="7" rx="2.5" fill="hsl(var(--sun))" transform="rotate(12 239 37)" />
      <rect x="78" y="118" width="7" height="7" rx="2.5" fill="hsl(var(--lavender))" transform="rotate(-30 81 121)" />

      {/* adulto esquerdo */}
      <path d="M74 184c0-30 19-48 42-48s42 18 42 48z" fill="hsl(var(--primary))" />
      <circle cx="116" cy="116" r="19" fill="hsl(28 62% 88%)" />
      <path d="M97 116a19 19 0 0 1 38 0c-5-9-11-13-19-13s-14 4-19 13z" fill="hsl(20 32% 30%)" />

      {/* adulto direito */}
      <path d="M168 184c0-26 17-42 37-42s37 16 37 42z" fill="hsl(266 45% 80%)" />
      <circle cx="205" cy="126" r="17" fill="hsl(30 55% 84%)" />
      <path d="M188 127a17 17 0 0 1 34 0c-4-8-9-11-17-11s-13 3-17 11z" fill="hsl(24 34% 34%)" />

      {/* bebê no sling */}
      <ellipse cx="164" cy="160" rx="26" ry="19" fill="hsl(36 78% 95%)" />
      <circle cx="176" cy="146" r="11" fill="hsl(28 62% 88%)" />
      <path d="M152 150c8 6 16 9 24 9s14-2 20-6" stroke="hsl(var(--primary))" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M136 176c8 12 22 19 38 19" stroke="hsl(13 60% 60%)" strokeWidth="10" strokeLinecap="round" fill="none" />
    </svg>
  );
}
