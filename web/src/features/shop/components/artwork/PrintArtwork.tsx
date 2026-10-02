/** "Blue hour": a pink sun setting behind two blue hills, the second one printed slightly off. */
export function PrintArtwork() {
  return (
    <>
      <circle cx="118" cy="96" r="50" fill="var(--color-pink)" className="mix-blend-multiply" />
      <path
        d="M0 168 C40 138 82 148 112 164 S172 192 200 160 V250 H0 Z"
        fill="var(--color-blue)"
        className="mix-blend-multiply"
      />
      <path
        d="M0 204 C48 184 92 198 132 208 S182 218 200 202 V250 H0 Z"
        fill="var(--color-blue)"
        opacity="0.7"
        transform="translate(4 3)"
        className="mix-blend-multiply"
      />
      <path
        d="M24 40 H76 M24 50 H60"
        stroke="var(--color-blue)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  );
}
