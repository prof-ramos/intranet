const POINTS_PER_INCH = 72;
const MM_PER_INCH = 25.4;
const POINTS_PER_MM = POINTS_PER_INCH / MM_PER_INCH;

export function mmToPoints(mm: number): number {
  return mm * POINTS_PER_MM;
}

export function pointsToMm(points: number): number {
  return points / POINTS_PER_MM;
}
