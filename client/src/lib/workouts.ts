export interface DraftSetInput {
  setNumber: number;
  weight: string;
  reps: string;
}

export function roundMetric(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateDraftStats(sets: DraftSetInput[]) {
  return sets.reduce(
    (summary, current) => {
      const parsedWeight = Number(current.weight || 0);
      const parsedReps = Number(current.reps || 0);
      const weight = Number.isFinite(parsedWeight) ? parsedWeight : 0;
      const reps = Number.isFinite(parsedReps) ? parsedReps : 0;
      const estimatedOneRepMax = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;

      summary.maxWeight = Math.max(summary.maxWeight, weight);
      summary.totalVolume += weight * reps;
      summary.bestEstimatedOneRepMax = Math.max(summary.bestEstimatedOneRepMax, estimatedOneRepMax);
      summary.setCount += weight > 0 || reps > 0 ? 1 : 0;
      return summary;
    },
    {
      maxWeight: 0,
      totalVolume: 0,
      bestEstimatedOneRepMax: 0,
      setCount: 0,
    },
  );
}
