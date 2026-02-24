// Helper to generate smooth path from points (Catmull-Rom to Bezier conversion)
// Must be a worklet since it's called from useDerivedValue on UI thread
// smoothingPasses: number of moving average passes (0 = no smoothing, 3 = full smoothing)
export function generateSmoothPath(
  points: Array<{ x: number; y: number }>,
  _containerHeight: number,
  smoothingPasses = 3
): string {
  "worklet";
  if (points.length < 2) return "";

  // Apply multiple passes of moving average smoothing for ultra-smooth curves
  // This creates flowing curves like Cash App by heavily averaging Y values
  let smoothedPoints: Array<{ x: number; y: number }> = [...points];

  // Apply smoothing passes (0 = skip smoothing for detailed/scrubbed view)
  for (let pass = 0; pass < smoothingPasses; pass++) {
    const newSmoothed: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < smoothedPoints.length; i++) {
      const point = smoothedPoints[i];
      if (!point) continue;

      if (i < 2 || i >= smoothedPoints.length - 2) {
        // Keep near-endpoints as-is
        newSmoothed.push(point);
      } else {
        // 5-point weighted moving average (gaussian-like weights)
        const p2 = smoothedPoints[i - 2]?.y ?? point.y;
        const p1 = smoothedPoints[i - 1]?.y ?? point.y;
        const p0 = point.y;
        const n1 = smoothedPoints[i + 1]?.y ?? point.y;
        const n2 = smoothedPoints[i + 2]?.y ?? point.y;

        // Weights: 1, 4, 6, 4, 1 (gaussian kernel)
        const smoothedY = (p2 + 4 * p1 + 6 * p0 + 4 * n1 + n2) / 16;

        newSmoothed.push({
          x: point.x,
          y: smoothedY,
        });
      }
    }
    smoothedPoints = newSmoothed;
  }

  // Higher tension = rounder curves
  const tension = 1.0;

  const firstPoint = smoothedPoints[0];
  if (!firstPoint) return "";

  let d = `M ${firstPoint.x} ${firstPoint.y}`;

  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    const p0 = i > 0 ? smoothedPoints[i - 1] : smoothedPoints[i];
    const p1 = smoothedPoints[i];
    const p2 = smoothedPoints[i + 1];
    const p3 = i < smoothedPoints.length - 2 ? smoothedPoints[i + 2] : p2;

    if (!p0 || !p1 || !p2 || !p3) continue;

    // Calculate control points using Catmull-Rom to Bezier conversion
    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

// Generate area path (fills area under the line to bottom of chart)
// Must be a worklet since it's called from useDerivedValue on UI thread
// smoothingPasses: number of moving average passes (0 = no smoothing, 3 = full smoothing)
export function generateAreaPath(
  points: Array<{ x: number; y: number | null }>,
  chartBottom: number,
  smoothingPasses = 3
): string {
  "worklet";
  if (points.length < 2) return "";

  // Filter out null y values
  const validPoints: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p && p.y !== null) {
      validPoints.push({ x: p.x, y: p.y });
    }
  }
  if (validPoints.length < 2) return "";

  // Apply multiple passes of moving average smoothing to match the line curve
  let smoothedPoints: Array<{ x: number; y: number }> = [...validPoints];

  // Apply smoothing passes (0 = skip smoothing for detailed/scrubbed view)
  for (let pass = 0; pass < smoothingPasses; pass++) {
    const newSmoothed: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < smoothedPoints.length; i++) {
      const point = smoothedPoints[i];
      if (!point) continue;

      if (i < 2 || i >= smoothedPoints.length - 2) {
        // Keep near-endpoints as-is
        newSmoothed.push(point);
      } else {
        // 5-point weighted moving average (gaussian-like weights)
        const p2 = smoothedPoints[i - 2]?.y ?? point.y;
        const p1 = smoothedPoints[i - 1]?.y ?? point.y;
        const p0 = point.y;
        const n1 = smoothedPoints[i + 1]?.y ?? point.y;
        const n2 = smoothedPoints[i + 2]?.y ?? point.y;

        // Weights: 1, 4, 6, 4, 1 (gaussian kernel)
        const smoothedY = (p2 + 4 * p1 + 6 * p0 + 4 * n1 + n2) / 16;

        newSmoothed.push({
          x: point.x,
          y: smoothedY,
        });
      }
    }
    smoothedPoints = newSmoothed;
  }

  // Match tension from generateSmoothPath
  const tension = 1.0;
  const firstPoint = smoothedPoints[0];
  const lastPoint = smoothedPoints[smoothedPoints.length - 1];

  if (!firstPoint || !lastPoint) return "";

  // Start at the bottom-left
  let d = `M ${firstPoint.x} ${chartBottom}`;

  // Line up to the first point
  d += ` L ${firstPoint.x} ${firstPoint.y}`;

  // Draw the smooth curve along the top
  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    const p0 = i > 0 ? smoothedPoints[i - 1] : smoothedPoints[i];
    const p1 = smoothedPoints[i];
    const p2 = smoothedPoints[i + 1];
    const p3 = i < smoothedPoints.length - 2 ? smoothedPoints[i + 2] : p2;

    if (!p0 || !p1 || !p2 || !p3) continue;

    const cp1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const cp1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const cp2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const cp2y = p2.y - ((p3.y - p1.y) / 6) * tension;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  // Line down to bottom-right and close the path
  // Extend slightly past the last point to ensure dots at that x-position are covered
  d += ` L ${lastPoint.x + 10} ${lastPoint.y}`;
  d += ` L ${lastPoint.x + 10} ${chartBottom}`;
  d += " Z";

  return d;
}
