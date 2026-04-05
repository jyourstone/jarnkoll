import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatDate, formatVolume, formatWeight } from '../lib/format';
import type { WorkoutLogSummary } from '../lib/types';

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLogSummary[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listLogs()
      .then(setLogs)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Allt sparat över tid</p>
          <h2>Historik</h2>
        </div>
      </div>

      {error ? <section className="card error-card">{error}</section> : null}

      <div className="card-list">
        {logs.length ? (
          logs.map((log) => (
            <article className="card log-summary-card" key={log.id}>
              <div className="card-row">
                <div>
                  <strong>{log.templateNameSnapshot}</strong>
                  <p className="muted">{formatDate(log.performedOn)}</p>
                </div>
                <div className="row-actions">
                  <Link className="ghost-button" to={`/historik/${log.id}`}>
                    Detaljer
                  </Link>
                  <Link className="secondary-button" to={`/logga/klona/${log.id}`}>
                    Klona
                  </Link>
                </div>
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
                  <dt>Övningar</dt>
                  <dd>{log.exerciseCount}</dd>
                </div>
              </dl>
            </article>
          ))
        ) : (
          <article className="card empty-card">
            <strong>Ingen historik att visa än.</strong>
            <p>När du har loggat ditt första pass kan du snabbt klona det härifrån och följa din utveckling.</p>
          </article>
        )}
      </div>
    </section>
  );
}
