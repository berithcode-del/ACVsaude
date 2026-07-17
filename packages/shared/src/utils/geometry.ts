// ============================================================
// GEOMETRIA — DISTÂNCIAS E ÂNGULOS PARA LANDMARKS
// ============================================================

import type { Landmark } from '../types/tracking';

export function euclideanDistance(p1: Landmark, p2: Landmark): number {
  return Math.sqrt(
    Math.pow(p2.x - p1.x, 2) +
    Math.pow(p2.y - p1.y, 2) +
    Math.pow(p2.z - p1.z, 2)
  );
}

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export function visualAngleArcmin(objectHeightMm: number, distanceMm: number): number {
  return radiansToDegrees(Math.atan2(objectHeightMm, distanceMm)) * 60;
}
