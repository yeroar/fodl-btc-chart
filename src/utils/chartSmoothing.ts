export type ChartDataPoint = { timestamp: number; rate: number };

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

export function resampleWithSpline(data: ChartDataPoint[], targetCount: number): ChartDataPoint[] {
  if (data.length === 0) return [];
  if (data.length < 2 || targetCount < 2) return data;
  if (data.length === targetCount) return data;

  const result: ChartDataPoint[] = [];
  const n = data.length;

  for (let i = 0; i < targetCount; i++) {
    const t = i / (targetCount - 1);
    const pos = t * (n - 1);
    const seg = Math.floor(pos);
    const segT = pos - seg;

    const p0 = data[Math.max(0, seg - 1)]!;
    const p1 = data[seg]!;
    const p2 = data[Math.min(n - 1, seg + 1)]!;
    const p3 = data[Math.min(n - 1, seg + 2)]!;

    result.push({
      timestamp: catmullRom(p0.timestamp, p1.timestamp, p2.timestamp, p3.timestamp, segT),
      rate: catmullRom(p0.rate, p1.rate, p2.rate, p3.rate, segT),
    });
  }
  return result;
}

export function smoothChartData(data: ChartDataPoint[], targetPoints: number): ChartDataPoint[] {
  if (targetPoints >= data.length || targetPoints < 3 || data.length < 3) return data;
  const first = data[0]!;
  const last = data[data.length - 1]!;
  const sampled: ChartDataPoint[] = [first];
  const bucketSize = (data.length - 2) / (targetPoints - 2);

  for (let i = 0; i < targetPoints - 2; i++) {
    const start = Math.floor((i + 1) * bucketSize);
    const end = Math.min(Math.floor((i + 2) * bucketSize), data.length - 1);
    let sumTs = 0, sumRate = 0, count = 0;
    for (let j = start; j < end && j < data.length; j++) {
      sumTs += data[j]!.timestamp;
      sumRate += data[j]!.rate;
      count++;
    }
    if (count > 0) sampled.push({ timestamp: sumTs / count, rate: sumRate / count });
  }
  sampled.push(last);
  return sampled;
}

export function createSmoothCurve(data: ChartDataPoint[], controlPoints: number, outputPoints: number): ChartDataPoint[] {
  if (data.length === 0) return [];
  return resampleWithSpline(smoothChartData(data, controlPoints), outputPoints);
}

export function getTargetPointsForTimeframe(dataLength: number, _timeframe: string): number {
  return Math.min(20, dataLength);
}
