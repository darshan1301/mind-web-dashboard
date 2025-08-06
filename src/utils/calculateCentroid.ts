export type LatLngLiteral = { lat: number; lng: number };

export function calculateCentroid(coords: LatLngLiteral[]): LatLngLiteral {
  const n = coords.length;
  if (n === 0) {
    throw new Error("Cannot calculate centroid of empty coordinate array.");
  }
  // For a single point or two points, return average
  if (n < 3) {
    const sum = coords.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / n, lng: sum.lng / n };
  }

  let twiceArea = 0;
  let Cx = 0;
  let Cy = 0;

  for (let i = 0; i < n; i++) {
    const { lat: x0, lng: y0 } = coords[i];
    const { lat: x1, lng: y1 } = coords[(i + 1) % n];
    const cross = x0 * y1 - x1 * y0;
    twiceArea += cross;
    Cx += (x0 + x1) * cross;
    Cy += (y0 + y1) * cross;
  }

  const area = twiceArea / 2;
  if (area === 0) {
    // Degenerate polygon: fallback to average
    const sum = coords.reduce(
      (acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }),
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / n, lng: sum.lng / n };
  }

  const factor = 1 / (6 * area);
  return { lat: Cx * factor, lng: Cy * factor };
}
