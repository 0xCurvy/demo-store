import type { ProductView } from "@api";
import { PostcardsArtwork } from "./artwork/PostcardsArtwork";
import { PrintArtwork } from "./artwork/PrintArtwork";
import { StickersArtwork } from "./artwork/StickersArtwork";

const ARTWORK = {
  print: PrintArtwork,
  stickers: StickersArtwork,
  postcards: PostcardsArtwork,
};

/** Each product's picture, drawn in the shop's three inks. */
export function ProductArtwork({ artwork }: { artwork: ProductView["artwork"] }) {
  const Artwork = ARTWORK[artwork];

  return (
    <svg viewBox="0 0 200 250" aria-hidden="true" className="block h-auto w-full">
      <rect width="200" height="250" fill="var(--color-sheet)" />
      <Artwork />
    </svg>
  );
}
