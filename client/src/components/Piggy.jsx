import { motion } from "framer-motion";

/* The IshiFi piggy — soft, rounded, breathes gently.
   `fill` (0..1) raises a warm coin-fill inside the belly (savings goals). */
export default function Piggy({ size = 200, fill = 0, mood = "happy" }) {
  const fillY = 208 - 118 * Math.min(Math.max(fill, 0), 1);
  return (
    <motion.svg
      width={size} height={size * 0.82} viewBox="0 0 300 246"
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: [1, 1.018, 1], opacity: 1, rotate: [0, 0.6, 0] }}
      transition={{
        opacity: { duration: 0.5 },
        scale: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 4.6, repeat: Infinity, ease: "easeInOut" },
      }}
      style={{ display: "block", transformOrigin: "50% 60%" }}
    >
      <defs>
        <linearGradient id="pgBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-2)" />
        </linearGradient>
        <linearGradient id="pgFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE9B8" />
          <stop offset="1" stopColor="#F0B94B" />
        </linearGradient>
        <clipPath id="pgClip">
          <ellipse cx="150" cy="140" rx="112" ry="88" />
        </clipPath>
      </defs>

      {/* shadow */}
      <motion.ellipse
        cx="150" cy="234" rx="86" ry="12" fill="var(--text)" opacity="0.1"
        animate={{ scaleX: [1, 1.05, 1] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* tail */}
      <path d="M40 132 C 22 124, 18 146, 34 148 C 45 149, 44 137, 37 139"
        stroke="var(--primary-2)" strokeWidth="7" strokeLinecap="round" fill="none" />
      {/* legs */}
      <rect x="88" y="196" width="26" height="36" rx="12" fill="var(--primary-2)" />
      <rect x="186" y="196" width="26" height="36" rx="12" fill="var(--primary-2)" />
      {/* body */}
      <ellipse cx="150" cy="140" rx="112" ry="88" fill="url(#pgBody)" />
      {/* savings fill inside belly */}
      {fill > 0 && (
        <g clipPath="url(#pgClip)">
          <motion.rect
            x="38" width="224" height="140" fill="url(#pgFill)" opacity="0.92"
            initial={{ y: 230 }}
            animate={{ y: fillY }}
            transition={{ type: "spring", stiffness: 60, damping: 16 }}
          />
          <motion.ellipse
            cx="150" rx="115" ry="7" fill="#FFF2CE" opacity="0.9"
            initial={{ cy: 230 }}
            animate={{ cy: [fillY, fillY - 2.5, fillY] }}
            transition={{
              cy: { duration: 3, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </g>
      )}
      {/* sheen */}
      <ellipse cx="112" cy="102" rx="54" ry="34" fill="#fff" opacity="0.16" />
      {/* ear */}
      <path d="M92 62 C 82 40, 106 30, 122 44 C 113 53, 106 62, 102 72 Z" fill="var(--primary-2)" />
      {/* coin slot */}
      <rect x="132" y="52" width="44" height="9" rx="4.5" fill="color-mix(in srgb, var(--primary-2) 50%, #4a1030)" />
      {/* snout */}
      <ellipse cx="240" cy="140" rx="30" ry="25" fill="var(--primary-2)" />
      <ellipse cx="233" cy="136" rx="5" ry="7.5" fill="color-mix(in srgb, var(--primary-2) 45%, #401028)" />
      <ellipse cx="248" cy="136" rx="5" ry="7.5" fill="color-mix(in srgb, var(--primary-2) 45%, #401028)" />
      {/* eye */}
      {mood === "happy" ? (
        <path d="M186 106 q 8 -10 16 0" stroke="color-mix(in srgb, var(--text) 70%, #000)" strokeWidth="5" strokeLinecap="round" fill="none" />
      ) : (
        <circle cx="194" cy="106" r="7" fill="color-mix(in srgb, var(--text) 70%, #000)" />
      )}
      {/* blush */}
      <ellipse cx="196" cy="150" rx="13" ry="7" fill="#fff" opacity="0.28" />
    </motion.svg>
  );
}
