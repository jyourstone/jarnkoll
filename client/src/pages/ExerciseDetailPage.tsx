import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { api } from '../lib/api';
import { formatCompactDate, formatWeight } from '../lib/format';
import type { ExerciseProgress } from '../lib/types';

type MetricKey = 'bestEstimatedOneRepMax' | 'maxWeight' | 'totalVolume';

const metricLabels: Record<MetricKey, string> = {
  bestEstimatedOneRepMax: 'Estimerad 1RM',
  maxWeight: 'Maxvikt',
  totalVolume: 'Volym',
};

export default function ExerciseDetailPage() {
  const { exerciseId } = useParams();
  const [data, setData] = useState<ExerciseProgress | null>(null);
  const [metric, setMetric] = useState<MetricKey>('bestEstimatedOneRepMax');
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(exerciseId);
    if (!Number.isInteger(id) || id <= 0) {
      setData(null);
      setError('Ogiltigt övnings-id.');
      return;
    }

    let cancelled = false;
    setData(null);
    setError('');

    api
      .getExerciseProgress(id)
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((reason: Error) => {
        if (!cancelled) {
          setError(reason.message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  const bestValue = useMemo(() => {
    if (!data?.points.length) {
      return 0;
    }

    return Math.max(...data.points.map((point) => point[metric]));
  }, [data, metric]);

  if (error) {
    return <section className="card error-card">{error}</section>;
  }

  if (!data) {
    return <section className="card empty-card">Laddar utveckling...</section>;
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Övningshistorik</p>
          <h2>{data.exercise.name}</h2>
        </div>
        <Link className="ghost-button" to="/historik">
          Till historik
        </Link>
      </div>

      <section className="card info-card">
        <strong>Hogsta notering i valt matt</strong>
        <p>{formatWeight(bestValue)}</p>
      </section>

      <div className="segment-control" role="tablist" aria-label="Val av grafmatt">
        {(Object.keys(metricLabels) as MetricKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`segment-button${metric === key ? ' is-active' : ''}`}
            onClick={() => setMetric(key)}
          >
            {metricLabels[key]}
          </button>
        ))}
      </div>

      <section className="card chart-card">
        {data.points.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.points}>
              <XAxis
                dataKey="performedOn"
                stroke="#94a3b8"
                tickFormatter={formatCompactDate}
                minTickGap={12}
              />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value: number) => formatWeight(value)}
                labelFormatter={(value: string) => formatCompactDate(value)}
                contentStyle={{
                  borderRadius: 16,
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  background: '#0f1720',
                }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="#fb923c"
                strokeWidth={3}
                dot={{ fill: '#f8fafc', r: 4 }}
                activeDot={{ r: 6, fill: '#f43f5e' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-card">
            <strong>Ingen progression att visa än.</strong>
            <p>Övningen har inte loggats i historiken ännu.</p>
          </div>
        )}
      </section>

      <div className="card-list">
        {data.points
          .slice()
          .reverse()
          .map((point) => (
            <article className="card nested-card" key={point.logId}>
              <div className="card-row">
                <div>
                  <strong>{point.templateName}</strong>
                  <p className="muted">{formatCompactDate(point.performedOn)}</p>
                </div>
                <span className="metric-chip">{formatWeight(point[metric])}</span>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
}
