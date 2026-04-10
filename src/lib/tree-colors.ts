/**
 * tree-colors.ts — Algorithmic HSL color generation for tree nodes
 *
 * Level 1 (root sections): Golden Angle distribution (137.5°)
 * Level 2+ (children): Analogic fan (60° spread around parent hue)
 *
 * Theme controls only Saturation & Lightness; Hue stays the same.
 */

export const BASE_HUE = 220; // Pangea brand blue

export interface NodeColors {
  hue: number;
  color: string;
  colorLight: string;
  glow: string;
}

/* ── HSL → Hex conversion ──────────────────────────────── */

function hslToHex(h: number, s: number, l: number): string {
  const sN = s / 100;
  const lN = l / 100;
  const q = lN < 0.5 ? lN * (1 + sN) : lN + sN - lN * sN;
  const p = 2 * lN - q;
  const hN = h / 360;

  const hue2rgb = (pp: number, qq: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return pp + (qq - pp) * 6 * tt;
    if (tt < 1 / 2) return qq;
    if (tt < 2 / 3) return pp + (qq - pp) * (2 / 3 - tt) * 6;
    return pp;
  };

  const r = Math.round(hue2rgb(p, q, hN + 1 / 3) * 255);
  const g = Math.round(hue2rgb(p, q, hN) * 255);
  const b = Math.round(hue2rgb(p, q, hN - 1 / 3) * 255);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/* ── Main generator ───────────────────────────────────── */

/**
 * Generate HSL-based colors for a tree node.
 *
 * @param level       - 1 = root section, 2+ = children
 * @param index       - Position among siblings (0-based)
 * @param parentHue   - Parent node's hue (used for level 2+)
 * @param totalSiblings - Total number of siblings (used for level 2+)
 * @param theme       - 'dark' or 'light'
 */
export function generateNodeColors(
  level: number,
  index: number,
  parentHue: number = BASE_HUE,
  totalSiblings: number = 1,
  theme: "dark" | "light" = "dark",
): NodeColors {
  // Theme-dependent saturation & lightness
  const S = theme === "dark" ? 80 : 75;
  const L = theme === "dark" ? 65 : 45;

  let hue = parentHue;

  if (level === 1) {
    // Golden Angle distribution — maximally spaced hues
    hue = (BASE_HUE + index * 137.5) % 360;
  } else if (level >= 2) {
    // Analogic fan: children spread ±30° around parent hue
    const spread = 60;
    if (totalSiblings > 1) {
      const step = spread / (totalSiblings - 1);
      hue = (parentHue - spread / 2 + index * step + 360) % 360;
    }
    // If single child, keep parent hue
  }

  const color = hslToHex(hue, S, L);
  const colorLight = hslToHex(hue, S, Math.min(82, L + 13));

  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);

  return {
    hue,
    color,
    colorLight,
    glow: `rgba(${r},${g},${b},0.3)`,
  };
}
