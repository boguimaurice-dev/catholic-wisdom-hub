export const MIN_READING_SIZE = 15;
export const MAX_READING_SIZE = 96;

export function readingSize(value: number): number {
  return Math.max(MIN_READING_SIZE, Math.min(MAX_READING_SIZE, Number.isFinite(value) ? value : 19));
}

export function pinchedReadingSize(size: number, startDistance: number, distance: number): number {
  return readingSize(startDistance > 0 ? Math.round(size * distance / startDistance) : size);
}