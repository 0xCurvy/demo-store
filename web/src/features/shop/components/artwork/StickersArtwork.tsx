/** Six stickers on a sheet; where two inks overlap they make a third colour. */
export function StickersArtwork() {
  return (
    <g className="mix-blend-multiply">
      <circle cx="56" cy="78" r="28" fill="var(--color-yellow)" />
      <path
        d="M112 48 L120 70 L143 70 L125 84 L132 106 L112 93 L92 106 L99 84 L81 70 L104 70 Z"
        fill="var(--color-pink)"
      />
      <rect
        x="138"
        y="58"
        width="44"
        height="44"
        rx="10"
        fill="var(--color-blue)"
        transform="rotate(12 160 80)"
      />
      <path d="M30 196 L58 146 L86 196 Z" fill="var(--color-blue)" />
      <circle cx="108" cy="170" r="26" fill="var(--color-pink)" />
      <path
        d="M142 150 C166 138 190 156 180 178 C172 198 146 200 138 184 C130 170 128 158 142 150 Z"
        fill="var(--color-yellow)"
      />
      <circle cx="84" cy="100" r="14" fill="var(--color-blue)" />
      <circle cx="128" cy="150" r="10" fill="var(--color-yellow)" />
    </g>
  );
}
