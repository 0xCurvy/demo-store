/** Three postcards fanned out on the table, the top one with a pink stamp. */
export function PostcardsArtwork() {
  return (
    <g className="mix-blend-multiply">
      <rect
        x="30"
        y="58"
        width="130"
        height="88"
        fill="var(--color-yellow)"
        transform="rotate(-9 95 102)"
      />
      <rect
        x="44"
        y="98"
        width="130"
        height="88"
        fill="var(--color-blue)"
        opacity="0.85"
        transform="rotate(5 109 142)"
      />
      <rect
        x="36"
        y="136"
        width="130"
        height="88"
        fill="var(--color-yellow)"
        transform="rotate(-3 101 180)"
      />
      <rect
        x="128"
        y="146"
        width="26"
        height="30"
        fill="var(--color-pink)"
        transform="rotate(-3 141 161)"
      />
      <path
        d="M52 168 H108 M52 180 H100 M52 192 H90"
        stroke="var(--color-blue)"
        strokeWidth="3"
        strokeLinecap="round"
        transform="rotate(-3 80 180)"
      />
    </g>
  );
}
