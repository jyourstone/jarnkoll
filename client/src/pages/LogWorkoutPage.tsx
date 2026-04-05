import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import CelebrationOverlay from '../components/CelebrationOverlay';
import ComparisonBadge from '../components/ComparisonBadge';
import { api } from '../lib/api';
import { formatDate, formatWeight, todayString } from '../lib/format';
import type { ComparisonEntry, TemplateLogContext, WorkoutLog } from '../lib/types';
import { calculateDraftStats, roundMetric, type DraftSetInput } from '../lib/workouts';

interface ExerciseDraft {
  exerciseId: number | null;
  exerciseNameSnapshot: string;
  sortOrder: number;
  sets: DraftSetInput[];
}

function buildBlankSets(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    setNumber: index + 1,
    weight: '',
    reps: '',
  }));
}

function buildDraftFromTemplate(context: TemplateLogContext): ExerciseDraft[] {
  return context.template.exercises.map((exercise, index) => {
    const previous = context.comparisonByExerciseId[String(exercise.exerciseId)];
    const previousSetCount = context.previousLog?.exercises.find((item) => item.exerciseId === exercise.exerciseId)?.sets.length ?? 0;
    const count = Math.max(exercise.defaultSets, previousSetCount, 1);

    return {
      exerciseId: exercise.exerciseId,
      exerciseNameSnapshot: exercise.exerciseName,
      sortOrder: index,
      sets: buildBlankSets(count),
    };
  });
}

function buildDraftFromLog(log: WorkoutLog): ExerciseDraft[] {
  return log.exercises.map((exercise, index) => ({
    exerciseId: exercise.exerciseId,
    exerciseNameSnapshot: exercise.exerciseNameSnapshot,
    sortOrder: index,
    sets: exercise.sets.map((setItem, setIndex) => ({
      setNumber: setIndex + 1,
      weight: String(setItem.weight),
      reps: String(setItem.reps),
    })),
  }));
}

function buildComparisonFromLog(log: WorkoutLog) {
  const byId: Record<string, ComparisonEntry> = {};
  const byName: Record<string, ComparisonEntry> = {};

  log.exercises.forEach((exercise) => {
    const entry: ComparisonEntry = {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseNameSnapshot,
      performedOn: log.performedOn,
      ...exercise.stats,
    };

    if (exercise.exerciseId) {
      byId[String(exercise.exerciseId)] = entry;
    }

    byName[exercise.exerciseNameSnapshot.toLowerCase()] = entry;
  });

  return { byId, byName };
}

export default function LogWorkoutPage() {
  const { templateId, logId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(templateId ? Number(templateId) : null);
  const [performedOn, setPerformedOn] = useState(todayString());
  const [notes, setNotes] = useState('');
  const [exerciseDrafts, setExerciseDrafts] = useState<ExerciseDraft[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string; exerciseCount: number }[]>([]);
  const [comparisonById, setComparisonById] = useState<Record<string, ComparisonEntry>>({});
  const [comparisonByName, setComparisonByName] = useState<Record<string, ComparisonEntry>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const hadImprovementRef = useRef(false);

  useEffect(() => {
    setLoading(true);
    setError('');

    if (logId) {
      api
        .getLog(Number(logId))
        .then((log) => {
          const comparison = buildComparisonFromLog(log);
          setSelectedTemplateId(log.templateId);
          setTitle(log.templateNameSnapshot);
          setNotes('');
          setPerformedOn(todayString());
          setExerciseDrafts(buildDraftFromLog(log));
          setComparisonById(comparison.byId);
          setComparisonByName(comparison.byName);
        })
        .catch((reason: Error) => setError(reason.message))
        .finally(() => setLoading(false));
      return;
    }

    if (templateId) {
      api
        .getTemplateLogContext(Number(templateId), performedOn)
        .then((context) => {
          setSelectedTemplateId(context.template.id);
          setTitle(context.template.name);
          setExerciseDrafts(buildDraftFromTemplate(context));
          setComparisonById(context.comparisonByExerciseId);
          setComparisonByName(context.comparisonByExerciseName);
          setNotes('');
        })
        .catch((reason: Error) => setError(reason.message))
        .finally(() => setLoading(false));
      return;
    }

    api
      .listTemplates()
      .then((items) => setTemplates(items.map((template) => ({ id: template.id, name: template.name, exerciseCount: template.exerciseCount }))))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, [templateId, logId]);

  const exerciseProgress = useMemo(
    () =>
      exerciseDrafts.map((exercise) => {
        const previous =
          (exercise.exerciseId ? comparisonById[String(exercise.exerciseId)] : undefined) ??
          comparisonByName[exercise.exerciseNameSnapshot.toLowerCase()] ??
          null;

        const current = calculateDraftStats(exercise.sets);
        return {
          key: exercise.exerciseId ?? exercise.exerciseNameSnapshot,
          exercise,
          previous,
          current,
          improved:
            Boolean(previous) && current.bestEstimatedOneRepMax > 0 && current.bestEstimatedOneRepMax > previous.bestEstimatedOneRepMax,
        };
      }),
    [exerciseDrafts, comparisonById, comparisonByName],
  );

  useEffect(() => {
    const improvements = exerciseProgress.filter((item) => item.improved);
    const hasImprovement = improvements.length > 0;

    if (hasImprovement && !hadImprovementRef.current) {
      setCelebrationMessage(`Du slår ${improvements[0].exercise.exerciseNameSnapshot} jämfört med senast.`);
      const timeout = window.setTimeout(() => setCelebrationMessage(''), 2200);
      hadImprovementRef.current = true;
      return () => window.clearTimeout(timeout);
    }

    if (!hasImprovement) {
      hadImprovementRef.current = false;
    }

    return undefined;
  }, [exerciseProgress]);

  function updateSet(exerciseIndex: number, setIndex: number, patch: Partial<DraftSetInput>) {
    setExerciseDrafts((current) =>
      current.map((exercise, currentExerciseIndex) => {
        if (currentExerciseIndex !== exerciseIndex) {
          return exercise;
        }

        return {
          ...exercise,
          sets: exercise.sets.map((setItem, currentSetIndex) =>
            currentSetIndex === setIndex ? { ...setItem, ...patch } : setItem,
          ),
        };
      }),
    );
  }

  function addSet(exerciseIndex: number) {
    setExerciseDrafts((current) =>
      current.map((exercise, currentIndex) =>
        currentIndex === exerciseIndex
          ? {
              ...exercise,
              sets: [...exercise.sets, { setNumber: exercise.sets.length + 1, weight: '', reps: '' }],
            }
          : exercise,
      ),
    );
  }

  function removeSet(exerciseIndex: number, setIndex: number) {
    setExerciseDrafts((current) =>
      current.map((exercise, currentIndex) => {
        if (currentIndex !== exerciseIndex || exercise.sets.length === 1) {
          return exercise;
        }

        const nextSets = exercise.sets
          .filter((_, currentSetIndex) => currentSetIndex !== setIndex)
          .map((setItem, currentSetIndex) => ({
            ...setItem,
            setNumber: currentSetIndex + 1,
          }));

        return {
          ...exercise,
          sets: nextSets,
        };
      }),
    );
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const exercises = exerciseDrafts.map((exercise) => {
        const sets = exercise.sets
          .map((setItem, index) => ({
            setNumber: index + 1,
            weight: Number(setItem.weight || 0),
            reps: Number(setItem.reps || 0),
          }))
          .filter((setItem) => setItem.weight > 0 || setItem.reps > 0);

        if (!sets.length) {
          throw new Error(`Fyll i minst ett set för ${exercise.exerciseNameSnapshot}.`);
        }

        return {
          exerciseId: exercise.exerciseId,
          exerciseNameSnapshot: exercise.exerciseNameSnapshot,
          sortOrder: exercise.sortOrder,
          sets,
        };
      });

      const log = await api.createLog({
        templateId: selectedTemplateId,
        templateNameSnapshot: title,
        performedOn,
        notes,
        exercises,
      });

      navigate(`/historik/${log.id}`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <section className="page-stack">
        <article className="card empty-card">Laddar...</article>
      </section>
    );
  }

  if (!templateId && !logId) {
    return (
      <section className="page-stack">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Starta loggning</p>
            <h2>Valj vilket pass du ska kora</h2>
          </div>
        </div>

        {error ? <section className="card error-card">{error}</section> : null}

        <div className="card-list">
          {templates.length ? (
            templates.map((template) => (
              <Link className="card template-card" key={template.id} to={`/logga/pass/${template.id}`}>
                <strong>{template.name}</strong>
                <p className="muted">{template.exerciseCount} övningar</p>
              </Link>
            ))
          ) : (
            <article className="card empty-card">
              <strong>Det finns inga pass att logga än.</strong>
              <p>Skapa ett träningspass först och kom tillbaka hit när du vill registrera ett pass.</p>
              <Link className="primary-button" to="/pass/nytt">
                Skapa pass
              </Link>
            </article>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <CelebrationOverlay active={Boolean(celebrationMessage)} message={celebrationMessage} />

      <div className="section-heading">
        <div>
          <p className="section-kicker">{logId ? 'Klonad från historik' : 'Registrera pass'}</p>
          <h2>{title}</h2>
        </div>
        <Link className="ghost-button" to="/historik">
          Historik
        </Link>
      </div>

      <form className="page-stack" onSubmit={handleSave}>
        <section className="card form-card">
          <div className="two-column-grid">
            <label className="field">
              <span>Passnamn</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label className="field">
              <span>Datum</span>
              <input type="date" value={performedOn} onChange={(event) => setPerformedOn(event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Anteckningar</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Hur kändes passet?" />
          </label>
        </section>

        {exerciseProgress.map((entry, exerciseIndex) => (
          <section className="card exercise-log-card" key={entry.key}>
            <div className="card-row">
              <div>
                <p className="section-kicker">Övning {exerciseIndex + 1}</p>
                <h3>{entry.exercise.exerciseNameSnapshot}</h3>
              </div>
              {entry.improved ? <span className="pill success-pill">Över senast</span> : null}
            </div>

            <ComparisonBadge previous={entry.previous} currentEstimatedOneRepMax={roundMetric(entry.current.bestEstimatedOneRepMax)} />

            <div className="set-table">
              <div className="set-table-row set-table-head">
                <span>Set</span>
                <span>Vikt</span>
                <span>Reps</span>
                <span />
              </div>

              {entry.exercise.sets.map((setItem, setIndex) => (
                <div className="set-table-row" key={`${entry.exercise.exerciseNameSnapshot}-${setIndex}`}>
                  <span className="set-pill">{setIndex + 1}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    inputMode="decimal"
                    value={setItem.weight}
                    onChange={(event) => updateSet(exerciseIndex, setIndex, { weight: event.target.value })}
                    placeholder="kg"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={setItem.reps}
                    onChange={(event) => updateSet(exerciseIndex, setIndex, { reps: event.target.value })}
                    placeholder="reps"
                  />
                  <button className="ghost-button danger" type="button" onClick={() => removeSet(exerciseIndex, setIndex)}>
                    Ta bort
                  </button>
                </div>
              ))}
            </div>

            <div className="card-row card-row-bottom">
              <button className="ghost-button" type="button" onClick={() => addSet(exerciseIndex)}>
                Lägg till set
              </button>

              <p className="muted">
                Nu: {entry.current.bestEstimatedOneRepMax > 0 ? `${formatWeight(entry.current.bestEstimatedOneRepMax)} estimerad 1RM` : 'Ingen data än'}
              </p>
            </div>
          </section>
        ))}

        {comparisonById && Object.keys(comparisonById).length > 0 ? (
          <section className="card info-card">
            <strong>Jämförelse aktiv</strong>
            <p>Du jämför mot passet från {formatDate(Object.values(comparisonById)[0].performedOn)} när det finns en tidigare logg.</p>
          </section>
        ) : null}

        {error ? <section className="card error-card">{error}</section> : null}

        <div className="sticky-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Sparar pass...' : 'Spara pass'}
          </button>
        </div>
      </form>
    </section>
  );
}
