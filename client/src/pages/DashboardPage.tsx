import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatCompactDate, formatVolume, formatWeight } from '../lib/format';
import type { DashboardSummary } from '../lib/types';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getDashboard()
      .then(setData)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <section className="page-stack">
      <section className="hero-panel">
        <div className="hero-actions">
          <Link className="primary-button" to="/logga">
            Logga pass
          </Link>
          <Link className="secondary-button" to="/pass/nytt">
            Skapa pass
          </Link>
        </div>
      </section>

      {error ? <section className="card error-card">{error}</section> : null}

      <section className="stats-grid">
        <article className="card stat-card">
          <p>Träningspass</p>
          <strong>{data?.counts.templates ?? 0}</strong>
        </article>
        <article className="card stat-card">
          <p>Övningar</p>
          <strong>{data?.counts.exercises ?? 0}</strong>
        </article>
        <article className="card stat-card">
          <p>Loggade pass</p>
          <strong>{data?.counts.logs ?? 0}</strong>
        </article>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Senaste aktiviteten</p>
            <h3>Historik i kortform</h3>
          </div>
          <Link to="/historik">Visa allt</Link>
        </div>

        <div className="card-list">
          {data?.recentLogs.length ? (
            data.recentLogs.map((log) => (
              <article className="card log-summary-card" key={log.id}>
                <div className="card-row">
                  <div>
                    <strong>{log.templateNameSnapshot}</strong>
                    <p className="muted">{formatCompactDate(log.performedOn)}</p>
                  </div>
                  <Link className="ghost-button" to={`/logga/klona/${log.id}`}>
                    Klona
                  </Link>
                </div>
                <dl className="metric-row">
                  <div>
                    <dt>Volym</dt>
                    <dd>{formatVolume(log.totalVolume)}</dd>
                  </div>
                  <div>
                    <dt>1RM</dt>
                    <dd>{formatWeight(log.bestEstimatedOneRepMax)}</dd>
                  </div>
                  <div>
                    <dt>Set</dt>
                    <dd>{log.setCount}</dd>
                  </div>
                </dl>
              </article>
            ))
          ) : (
            <article className="card empty-card">
              <strong>Ingen historik än.</strong>
              <p>Skapa ett träningspass och logga ditt första styrkepass för att komma igång.</p>
            </article>
          )}
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Flitigast loggade</p>
            <h3>Övningar att följa upp</h3>
          </div>
        </div>

        <div className="card-list">
          {data?.topExercises.length ? (
            data.topExercises.map((exercise) => (
              <Link className="card exercise-card" key={exercise.exerciseId} to={`/ovningar/${exercise.exerciseId}`}>
                <strong>{exercise.exerciseName}</strong>
                <p className="muted">
                  {exercise.entries} loggar • senast {formatCompactDate(exercise.latestPerformedOn)}
                </p>
              </Link>
            ))
          ) : (
            <article className="card empty-card">
              <strong>Inga övningar med historik än.</strong>
              <p>När du loggar pass dyker dina vanligaste övningar upp här.</p>
            </article>
          )}
        </div>
      </section>
    </section>
  );
}
