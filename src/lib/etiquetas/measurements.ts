export const POINTS_PER_INCH = 72;
export const MM_PER_INCH = 25.4;
export const POINTS_PER_MM = POINTS_PER_INCH / MM_PER_INCH;
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_WIDTH_POINTS = A4_WIDTH_MM * POINTS_PER_MM;
export const A4_HEIGHT_POINTS = A4_HEIGHT_MM * POINTS_PER_MM;

export function mmToPoints(mm: number): number {
  return mm * POINTS_PER_MM;
}

export function pointsToMm(points: number): number {
  return points / POINTS_PER_MM;
}
