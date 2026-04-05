import { formatDate, formatPercent, formatWeight } from '../lib/format';
import type { ComparisonEntry } from '../lib/types';

interface ComparisonBadgeProps {
  previous: ComparisonEntry | null;
  currentEstimatedOneRepMax: number;
}

export default function ComparisonBadge({ previous, currentEstimatedOneRepMax }: ComparisonBadgeProps) {
  if (!previous) {
    return <p className="comparison-copy muted">Ingen tidigare logg att jämföra med än.</p>;
  }

  const hasCurrentValue = currentEstimatedOneRepMax > 0;
  const delta =
    previous.bestEstimatedOneRepMax > 0 && hasCurrentValue
      ? (currentEstimatedOneRepMax - previous.bestEstimatedOneRepMax) / previous.bestEstimatedOneRepMax
      : 0;

  const stateClass = !hasCurrentValue ? 'is-neutral' : delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-neutral';

  return (
    <div className={`comparison-badge ${stateClass}`}>
      <p className="comparison-copy">
        Senast {formatDate(previous.performedOn)}: {previous.bestSetLabel || formatWeight(previous.maxWeight)}
      </p>
      <strong>{hasCurrentValue ? formatPercent(delta) : 'Börja mäta för att se skillnad'}</strong>
    </div>
  );
}
