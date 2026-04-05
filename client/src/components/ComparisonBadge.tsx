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
  const hasPreviousBaseline = previous.bestEstimatedOneRepMax > 0;
  const delta =
    hasPreviousBaseline && hasCurrentValue ? (currentEstimatedOneRepMax - previous.bestEstimatedOneRepMax) / previous.bestEstimatedOneRepMax : 0;

  const stateClass = !hasCurrentValue || !hasPreviousBaseline ? 'is-neutral' : delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-neutral';

  return (
    <div className={`comparison-badge ${stateClass}`}>
      <p className="comparison-copy">
        {hasPreviousBaseline
          ? `Senast ${formatDate(previous.performedOn)}: ${previous.bestSetLabel || formatWeight(previous.maxWeight)}`
          : `Senast ${formatDate(previous.performedOn)}: ingen tidigare matbar 1RM`}
      </p>
      <strong>
        {!hasCurrentValue
          ? 'Börja mäta för att se skillnad'
          : hasPreviousBaseline
            ? formatPercent(delta)
            : 'Sätt en första baslinje'}
      </strong>
    </div>
  );
}
