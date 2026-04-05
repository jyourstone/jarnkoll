import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { formatCompactDate } from '../lib/format';
import type { WorkoutTemplate } from '../lib/types';

export default function SessionsPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .listTemplates()
      .then(setTemplates)
      .catch((reason: Error) => setError(reason.message));
  }, []);

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="section-kicker">Passbibliotek</p>
          <h2>Dina träningspass</h2>
        </div>
        <Link className="primary-button" to="/pass/nytt">
          Nytt pass
        </Link>
      </div>

      {error ? <section className="card error-card">{error}</section> : null}

      <div className="card-list">
        {templates.length ? (
          templates.map((template) => (
            <article className="card template-card" key={template.id}>
              <div className="card-row">
                <div>
                  <h3>{template.name}</h3>
                  <p className="muted">{template.exerciseCount} övningar</p>
                </div>
                <Link className="ghost-button" to={`/pass/${template.id}`}>
                  Redigera
                </Link>
              </div>
              {template.notes ? <p className="template-notes">{template.notes}</p> : null}
              <div className="card-row card-row-bottom">
                <p className="muted">
                  {template.lastPerformedOn ? `Senast loggat ${formatCompactDate(template.lastPerformedOn)}` : 'Inte loggat än'}
                </p>
                <Link className="secondary-button" to={`/logga/pass/${template.id}`}>
                  Logga pass
                </Link>
              </div>
            </article>
          ))
        ) : (
          <article className="card empty-card">
            <strong>Du har inga sparade träningspass än.</strong>
            <p>Skapa ett pass med dina vanligaste övningar och använd det som mall när du loggar.</p>
            <Link className="primary-button" to="/pass/nytt">
              Skapa första passet
            </Link>
          </article>
        )}
      </div>
    </section>
  );
}
