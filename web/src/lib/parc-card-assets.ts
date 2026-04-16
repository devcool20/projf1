/**
 * Bump NEXT_PUBLIC_CARD_ASSET_VERSION in .env.local when you replace files under /public/cards
 * (same filename). Otherwise Next/Image and browsers may keep serving the old bitmap.
 */
export const CARD_ASSET_VERSION =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_CARD_ASSET_VERSION?.trim()
    ? process.env.NEXT_PUBLIC_CARD_ASSET_VERSION.trim()
    : "1";

export function withCardAssetVersion(path: string): string {
  if (!path.startsWith("/cards/")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}v=${CARD_ASSET_VERSION}`;
}
