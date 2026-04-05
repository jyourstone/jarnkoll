import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDate, formatVolume, formatWeight } from '../lib/format';
import type { WorkoutLog } from '../lib/types';

export default function LogDetailPage() {
  const { logId } = useParams();
  const [log, setLog] = useState<WorkoutLog | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = Number(logId);
    if (!Number.isInteger(id) || id <= 0) {
      setLog(null);
      setError('Ogiltigt logg-id.');
      return;
    }

    setLog(null);
    setError('');

    api
      .getLog(id)
      .then(setLog)
      .catch((reason: Error) => setError(reason.message));
  }, [logId]);

  if (error) {
    return <section className="card error-card">{error}</section>;
  }

  if (!log) {
    return <section className="card empty-card">Laddar pass...</section>;
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Sparat pass</p>
          <h2>{log.templateNameSnapshot}</h2>
          <p className="muted">{formatDate(log.performedOn)}</p>
        </div>
        <Link className="secondary-button" to={`/logga/klona/${log.id}`}>
          Klona
        </Link>
      </div>

      <section className="stats-grid">
        <article className="card stat-card">
          <p>Total volym</p>
          <strong>{formatVolume(log.summary.totalVolume)}</strong>
        </article>
        <article className="card stat-card">
          <p>Hogsta 1RM</p>
          <strong>{formatWeight(log.summary.bestEstimatedOneRepMax)}</strong>
        </article>
        <article className="card stat-card">
          <p>Set</p>
          <strong>{log.summary.setCount}</strong>
        </article>
      </section>

      {log.notes ? (
        <section className="card info-card">
          <strong>Anteckning</strong>
          <p>{log.notes}</p>
        </section>
      ) : null}

      <div className="card-list">
        {log.exercises.map((exercise) => (
          <article className="card nested-card" key={exercise.id}>
            <div className="card-row">
              <div>
                <strong>{exercise.exerciseNameSnapshot}</strong>
                {exercise.exerciseId ? (
                  <p className="muted">
                    <Link to={`/ovningar/${exercise.exerciseId}`}>Se utvecklingsgraf</Link>
                  </p>
                ) : null}
              </div>
              <div className="metric-chip">{formatWeight(exercise.stats.bestEstimatedOneRepMax)} 1RM</div>
            </div>

            <div className="set-table">
              <div className="set-table-row set-table-head">
                <span>Set</span>
                <span>Vikt</span>
                <span>Reps</span>
                <span>Volym</span>
              </div>
              {exercise.sets.map((setItem) => (
                <div className="set-table-row" key={setItem.id ?? setItem.setNumber}>
                  <span className="set-pill">{setItem.setNumber}</span>
                  <span>{formatWeight(setItem.weight)}</span>
                  <span>{setItem.reps}</span>
                  <span>{formatVolume(setItem.weight * setItem.reps)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
