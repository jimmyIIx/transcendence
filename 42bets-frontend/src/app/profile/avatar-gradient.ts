/**
 * Generates a deterministic Polymarket-style radial-gradient avatar from a seed
 * (e.g. the username). Returns a CSS `background` shorthand value.
 */
export function buildAvatarGradient(seed: string): string {
  const value = seed && seed.length > 0 ? seed : 'anon';

  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  const rand = (n: number): number => {
    let x = (hash ^ ((n + 1) * 0x9e3779b1)) >>> 0;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 0xffffffff;
  };

  const color = (n: number): string => {
    const r = Math.floor(rand(n) * 256);
    const g = Math.floor(rand(n + 1) * 256);
    const b = Math.floor(rand(n + 2) * 256);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const position = (n: number): string =>
    `at ${Math.floor(rand(n + 3) * 100)}% ${Math.floor(rand(n + 5) * 100)}%`;

  const layers = [10, 20, 30, 40].map(
    (n) => `radial-gradient(${position(n)}, ${color(n)} 0px, transparent 50%)`,
  );

  return `${layers.join(', ')}, ${color(0)}`;
}
