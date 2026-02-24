function getRGBA(color: string) {
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return { r: 0, g: 0, b: 0, a: 1 };
  return { r: +m[1]!, g: +m[2]!, b: +m[3]!, a: m[4] ? +m[4] : 1 };
}

export function toHex(color: string): string {
  const { r, g, b, a } = getRGBA(color);
  const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  if (a === 1) return `#${hex(r)}${hex(g)}${hex(b)}`;
  return `#${hex(r)}${hex(g)}${hex(b)}${hex(a * 255)}`;
}

export function toRGBA(hex: string): string {
  let h = hex.replace("#", "");
  if (h.length <= 4) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  const a = h.length === 8 ? parseInt(h.substring(6, 8), 16) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

export function adjustOpacity(color: string, opacity: number): string {
  const { r, g, b } = getRGBA(color);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
