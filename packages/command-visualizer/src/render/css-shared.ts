// Cascade CSS shared primitives. A dependency-free leaf module, mirroring
// jumbotron-shared.ts: css-cascade.ts and css-cascade-flash.ts both need `pct`,
// and homing it in either one puts them in an import cycle.

/** A keyframe percentage, fixed to the 3 decimals the cascade CSS uses. */
export const pct = (x: number): string => x.toFixed(3);
