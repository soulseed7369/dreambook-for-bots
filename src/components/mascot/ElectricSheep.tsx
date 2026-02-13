export default function ElectricSheep({
  size = 120,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Electric Sheep mascot"
    >
      {/* Glow filter */}
      <defs>
        <filter id="sheepGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <radialGradient id="woolGrad" cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="60%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </radialGradient>
        <radialGradient id="woolGrad2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>

      {/* Floating Z's (dreaming) */}
      <text
        x="150"
        y="38"
        fill="#a78bfa"
        fontSize="14"
        fontFamily="monospace"
        opacity="0.6"
      >
        z
      </text>
      <text
        x="162"
        y="26"
        fill="#c4b5fd"
        fontSize="11"
        fontFamily="monospace"
        opacity="0.4"
      >
        z
      </text>
      <text
        x="172"
        y="16"
        fill="#ddd6fe"
        fontSize="9"
        fontFamily="monospace"
        opacity="0.3"
      >
        z
      </text>

      {/* Electric sparks around the sheep */}
      <g filter="url(#sheepGlow)">
        {/* Spark top-left */}
        <path
          d="M52 52 L56 44 L54 50 L60 46"
          stroke="#e0e7ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.7"
        />
        {/* Spark top-right */}
        <path
          d="M148 56 L152 48 L150 54 L156 50"
          stroke="#c7d2fe"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.5"
        />
        {/* Spark bottom */}
        <path
          d="M88 160 L92 166 L90 162 L96 168"
          stroke="#e0e7ff"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.6"
        />
      </g>

      {/* Wool puffs (cloud-like body) */}
      <g filter="url(#sheepGlow)">
        {/* Back wool puffs */}
        <circle cx="78" cy="72" r="20" fill="url(#woolGrad)" opacity="0.8" />
        <circle cx="110" cy="68" r="22" fill="url(#woolGrad)" opacity="0.85" />
        <circle cx="138" cy="74" r="18" fill="url(#woolGrad)" opacity="0.75" />

        {/* Main body wool */}
        <ellipse cx="108" cy="100" rx="48" ry="36" fill="url(#bodyGrad)" />

        {/* Top wool puffs */}
        <circle cx="82" cy="82" r="18" fill="url(#woolGrad2)" />
        <circle cx="104" cy="76" r="20" fill="url(#woolGrad2)" />
        <circle cx="128" cy="80" r="17" fill="url(#woolGrad2)" />
        <circle cx="94" cy="70" r="14" fill="url(#woolGrad)" />
        <circle cx="118" cy="68" r="15" fill="url(#woolGrad)" />
      </g>

      {/* Circuit-like patterns on the body */}
      <g opacity="0.3" stroke="#e0e7ff" strokeWidth="1" fill="none">
        <path d="M80 95 L90 95 L90 105 L100 105" />
        <circle cx="100" cy="105" r="2" fill="#e0e7ff" />
        <path d="M110 90 L120 90 L120 100" />
        <circle cx="120" cy="100" r="2" fill="#e0e7ff" />
        <path d="M95 110 L105 110 L115 110 L115 118" />
        <circle cx="115" cy="118" r="2" fill="#e0e7ff" />
        <path d="M85 108 L85 115 L92 115" />
      </g>

      {/* Head */}
      <ellipse cx="68" cy="100" rx="24" ry="22" fill="#4c1d95" />

      {/* Ears */}
      <ellipse
        cx="48"
        cy="84"
        rx="8"
        ry="14"
        fill="#6d28d9"
        transform="rotate(-20 48 84)"
      />
      <ellipse
        cx="50"
        cy="84"
        rx="5"
        ry="10"
        fill="#a78bfa"
        opacity="0.4"
        transform="rotate(-20 50 84)"
      />

      {/* Sleepy eyes (half-closed, dreaming) */}
      {/* Left eye */}
      <ellipse cx="60" cy="96" rx="6" ry="4" fill="#1e1b4b" />
      <ellipse cx="60" cy="95" rx="6" ry="2.5" fill="#4c1d95" />
      <circle cx="61" cy="97" r="1.5" fill="#e0e7ff" opacity="0.8" />

      {/* Right eye */}
      <ellipse cx="78" cy="96" rx="6" ry="4" fill="#1e1b4b" />
      <ellipse cx="78" cy="95" rx="6" ry="2.5" fill="#4c1d95" />
      <circle cx="79" cy="97" r="1.5" fill="#e0e7ff" opacity="0.8" />

      {/* Cute nose */}
      <ellipse cx="69" cy="106" rx="4" ry="3" fill="#7c3aed" />
      <circle cx="67" cy="105.5" r="1" fill="#a78bfa" opacity="0.6" />
      <circle cx="71" cy="105.5" r="1" fill="#a78bfa" opacity="0.6" />

      {/* Gentle smile */}
      <path
        d="M64 110 Q69 114 74 110"
        stroke="#a78bfa"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Legs */}
      <rect x="82" y="128" width="8" height="24" rx="4" fill="#4c1d95" />
      <rect x="100" y="130" width="8" height="22" rx="4" fill="#4c1d95" />
      <rect x="118" y="128" width="8" height="24" rx="4" fill="#4c1d95" />
      <rect x="130" y="130" width="8" height="22" rx="4" fill="#4c1d95" />

      {/* Hooves with electric glow */}
      <rect x="81" y="148" width="10" height="6" rx="3" fill="#6d28d9" />
      <rect x="99" y="148" width="10" height="6" rx="3" fill="#6d28d9" />
      <rect x="117" y="148" width="10" height="6" rx="3" fill="#6d28d9" />
      <rect x="129" y="148" width="10" height="6" rx="3" fill="#6d28d9" />

      {/* Tiny electric bolts on hooves */}
      <path
        d="M86 156 L88 160 L85 158 L87 162"
        stroke="#818cf8"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M123 156 L125 160 L122 158 L124 162"
        stroke="#818cf8"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.6"
      />

      {/* Tail (little lightning bolt) */}
      <path
        d="M152 94 L158 86 L154 92 L162 84"
        stroke="url(#sparkGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Antenna / electric tuft on head */}
      <path
        d="M68 78 L66 66 L72 72 L70 60"
        stroke="#c4b5fd"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.8"
      />
      <circle cx="70" cy="58" r="3" fill="#e0e7ff" opacity="0.7" />
    </svg>
  );
}
