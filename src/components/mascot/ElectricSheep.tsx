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
      <defs>
        {/* Electric aura glow */}
        <filter id="aura" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur1" />
          <feColorMatrix
            in="blur1"
            type="matrix"
            values="0.6 0 0.4 0 0  0 0.3 0.6 0 0  0.8 0.2 1 0 0  0 0 0 0.6 0"
            result="purpleBlur"
          />
          <feMerge>
            <feMergeNode in="purpleBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Soft inner glow for the body */}
        <filter id="softGlow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" result="sg" />
          <feComposite in="SourceGraphic" in2="sg" operator="over" />
        </filter>
        {/* Aura outer ring */}
        <radialGradient id="auraGrad" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="55%" stopColor="transparent" />
          <stop offset="75%" stopColor="#8b5cf6" stopOpacity="0.15" />
          <stop offset="90%" stopColor="#a78bfa" stopOpacity="0.08" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Wool gradient — white with subtle warmth */}
        <radialGradient id="woolWhite" cx="45%" cy="35%" r="55%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#f0eef5" />
          <stop offset="100%" stopColor="#e2dff0" />
        </radialGradient>
        {/* Face — soft cream-white */}
        <radialGradient id="faceGrad" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#faf9fc" />
          <stop offset="100%" stopColor="#e8e4f0" />
        </radialGradient>
        {/* Electric spark gradient */}
        <linearGradient id="spark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>

      {/* Electric aura background */}
      <ellipse cx="100" cy="105" rx="80" ry="72" fill="url(#auraGrad)" />

      {/* Floating Z's */}
      <g opacity="0.5">
        <text x="148" y="42" fill="#a78bfa" fontSize="16" fontFamily="var(--font-space-grotesk), monospace" fontWeight="600">z</text>
        <text x="160" y="28" fill="#c4b5fd" fontSize="12" fontFamily="var(--font-space-grotesk), monospace" fontWeight="600" opacity="0.7">z</text>
        <text x="169" y="18" fill="#ddd6fe" fontSize="9" fontFamily="var(--font-space-grotesk), monospace" fontWeight="600" opacity="0.4">z</text>
      </g>

      {/* Electric arcs around the sheep */}
      <g filter="url(#softGlow)">
        {/* Top-left arc */}
        <path d="M48 60 Q42 52 50 48 Q46 42 54 40" stroke="#a78bfa" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5">
          <animate attributeName="opacity" values="0.5;0.2;0.5" dur="3s" repeatCount="indefinite" />
        </path>
        {/* Top-right arc */}
        <path d="M152 58 Q158 50 152 44 Q156 38 148 36" stroke="#c4b5fd" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.15;0.4" dur="2.5s" repeatCount="indefinite" />
        </path>
        {/* Bottom arc */}
        <path d="M76 164 Q82 170 88 166" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.45">
          <animate attributeName="opacity" values="0.45;0.15;0.45" dur="3.5s" repeatCount="indefinite" />
        </path>
        {/* Left spark */}
        <path d="M38 100 L42 94 L40 98 L46 92" stroke="#c4b5fd" strokeWidth="1.2" strokeLinecap="round" opacity="0.35">
          <animate attributeName="opacity" values="0.35;0.1;0.35" dur="2s" repeatCount="indefinite" />
        </path>
        {/* Right spark */}
        <path d="M160 96 L156 90 L158 94 L152 88" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2.8s" repeatCount="indefinite" />
        </path>
      </g>

      {/* === SHEEP BODY === */}
      <g filter="url(#aura)">
        {/* Legs — tucked under (sleeping pose) */}
        <ellipse cx="78" cy="142" rx="8" ry="10" fill="#e2dff0" />
        <ellipse cx="96" cy="144" rx="7" ry="9" fill="#dbd7ea" />
        <ellipse cx="118" cy="144" rx="7" ry="9" fill="#dbd7ea" />
        <ellipse cx="134" cy="142" rx="8" ry="10" fill="#e2dff0" />

        {/* Tiny hooves peeking out */}
        <ellipse cx="78" cy="150" rx="5" ry="3" fill="#c4bdd6" />
        <ellipse cx="134" cy="150" rx="5" ry="3" fill="#c4bdd6" />

        {/* Main body — large soft ellipse */}
        <ellipse cx="106" cy="112" rx="52" ry="36" fill="url(#woolWhite)" />

        {/* Wool puff clusters — fluffy cloud shapes on top */}
        <circle cx="72" cy="88" r="18" fill="#ffffff" />
        <circle cx="92" cy="80" r="20" fill="#ffffff" />
        <circle cx="114" cy="78" r="21" fill="#fefefe" />
        <circle cx="136" cy="82" r="18" fill="#fafafa" />
        <circle cx="148" cy="92" r="14" fill="#f8f7fc" />

        {/* Mid wool puffs for fullness */}
        <circle cx="80" cy="96" r="16" fill="#fcfbff" />
        <circle cx="102" cy="88" r="18" fill="#fefefe" />
        <circle cx="126" cy="90" r="17" fill="#fcfbff" />
        <circle cx="144" cy="100" r="13" fill="#f8f7fc" />

        {/* Bottom wool softness */}
        <circle cx="86" cy="126" r="14" fill="#f5f3fa" />
        <circle cx="108" cy="130" r="16" fill="#f5f3fa" />
        <circle cx="130" cy="126" r="14" fill="#f5f3fa" />
      </g>

      {/* Subtle circuit trace on wool */}
      <g opacity="0.12" stroke="#8b5cf6" strokeWidth="0.8" fill="none">
        <path d="M88 100 L98 100 L98 108 L108 108" />
        <circle cx="108" cy="108" r="1.5" fill="#8b5cf6" />
        <path d="M118 96 L126 96 L126 104" />
        <circle cx="126" cy="104" r="1.5" fill="#8b5cf6" />
        <path d="M100 118 L112 118 L112 124" />
        <circle cx="112" cy="124" r="1.5" fill="#8b5cf6" />
      </g>

      {/* === HEAD === */}
      <g>
        {/* Head shape — slightly tilted for sleepy pose */}
        <ellipse cx="62" cy="108" rx="26" ry="24" fill="url(#faceGrad)" />

        {/* Ears */}
        <ellipse cx="42" cy="90" rx="7" ry="14" fill="#f0eef5" transform="rotate(-25 42 90)" />
        <ellipse cx="43" cy="90" rx="4" ry="10" fill="#e8d5f5" opacity="0.5" transform="rotate(-25 43 90)" />

        {/* Right ear (partly hidden by wool) */}
        <ellipse cx="78" cy="88" rx="6" ry="12" fill="#f0eef5" transform="rotate(15 78 88)" />
        <ellipse cx="78" cy="88" rx="3.5" ry="8" fill="#e8d5f5" opacity="0.5" transform="rotate(15 78 88)" />

        {/* Closed sleeping eyes — gentle curved lines */}
        {/* Left eye */}
        <path d="M50 104 Q55 108 60 104" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Tiny lashes */}
        <path d="M52 106 L51 108" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M58 106 L59 108" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

        {/* Right eye */}
        <path d="M66 104 Q71 108 76 104" stroke="#6d28d9" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M68 106 L67 108" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
        <path d="M74 106 L75 108" stroke="#8b5cf6" strokeWidth="1" strokeLinecap="round" opacity="0.5" />

        {/* Small rosy cheeks */}
        <circle cx="48" cy="112" r="4" fill="#e8b4f8" opacity="0.2" />
        <circle cx="78" cy="112" r="4" fill="#e8b4f8" opacity="0.2" />

        {/* Nose — small rounded triangle */}
        <ellipse cx="63" cy="116" rx="4" ry="2.5" fill="#d4c8e8" />
        <circle cx="61" cy="115.5" r="1" fill="#c4b5e0" opacity="0.7" />
        <circle cx="65" cy="115.5" r="1" fill="#c4b5e0" opacity="0.7" />

        {/* Peaceful smile */}
        <path d="M58 120 Q63 124 68 120" stroke="#c4b5e0" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.6" />
      </g>

      {/* Tail — small lightning bolt */}
      <path
        d="M154 104 L160 96 L156 102 L164 94"
        stroke="url(#spark)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      >
        <animate attributeName="opacity" values="0.7;0.35;0.7" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Small electric dots floating around */}
      <circle cx="44" cy="70" r="2" fill="#c4b5fd" opacity="0.4">
        <animate attributeName="opacity" values="0.4;0.1;0.4" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="158" cy="74" r="1.5" fill="#a78bfa" opacity="0.3">
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="100" cy="168" r="1.5" fill="#8b5cf6" opacity="0.25">
        <animate attributeName="opacity" values="0.25;0.05;0.25" dur="3.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}
