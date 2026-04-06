import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import type { Exercise, TemplateExercise } from '../lib/types';

interface DraftExercise {
  exerciseId: number;
  exerciseName: string;
  defaultSets: string;
  notes: string;
}

function mapTemplateExercises(exercises: TemplateExercise[]): DraftExercise[] {
  return exercises.map((exercise) => ({
    exerciseId: exercise.exerciseId,
    exerciseName: exercise.exerciseName,
    defaultSets: String(exercise.defaultSets),
    notes: exercise.notes,
  }));
}

function normalizeDefaultSets(value: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return 1;
  }

  return Math.min(Math.max(parsed, 1), 12);
}

export default function SessionEditorPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(templateId);

  const [library, setLibrary] = useState<Exercise[]>([]);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.listExercises(), templateId ? api.getTemplate(Number(templateId)) : Promise.resolve(null)])
      .then(([exerciseLibrary, template]) => {
        setLibrary(exerciseLibrary);
        if (template) {
          setName(template.name);
          setNotes(template.notes);
          setDraftExercises(mapTemplateExercises(template.exercises ?? []));
        }
      })
      .catch((reason: Error) => setError(reason.message));
  }, [templateId]);

  function addExistingExercise() {
    const exercise = library.find((item) => item.id === Number(selectedExerciseId));
    if (!exercise) {
      return;
    }

    if (draftExercises.some((item) => item.exerciseId === exercise.id)) {
      setError('Övningen är redan tillagd i passet.');
      return;
    }

    setDraftExercises((current) => [
      ...current,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        defaultSets: '3',
        notes: '',
      },
    ]);
    setSelectedExerciseId('');
    setError('');
  }

  async function createAndAddExercise() {
    const trimmed = newExerciseName.trim();
    if (!trimmed) {
      return;
    }

    try {
      const exercise = await api.createExercise({ name: trimmed });
      setLibrary((current) => [...current, exercise].sort((left, right) => left.name.localeCompare(right.name, 'sv')));
      setDraftExercises((current) => [
        ...current,
        {
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          defaultSets: '3',
          notes: '',
        },
      ]);
      setNewExerciseName('');
      setError('');
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function handleAddExercise() {
    if (newExerciseName.trim()) {
      await createAndAddExercise();
      return;
    }

    addExistingExercise();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        name,
        notes,
        exercises: draftExercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          defaultSets: normalizeDefaultSets(exercise.defaultSets),
          notes: exercise.notes,
        })),
      };

      if (isEditing) {
        await api.updateTemplate(Number(templateId), payload);
      } else {
        await api.createTemplate(payload);
      }

      navigate('/pass');
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function moveExercise(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= draftExercises.length) {
      return;
    }

    setDraftExercises((current) => {
      const next = [...current];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  function updateDraftExercise(index: number, patch: Partial<DraftExercise>) {
    setDraftExercises((current) => current.map((exercise, currentIndex) => (currentIndex === index ? { ...exercise, ...patch } : exercise)));
  }

  function removeDraftExercise(index: number) {
    setDraftExercises((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function handleExistingExerciseChange(value: string) {
    setSelectedExerciseId(value);
    if (value) {
      setNewExerciseName('');
    }
  }

  function handleNewExerciseNameChange(value: string) {
    setNewExerciseName(value);
    if (value.trim()) {
      setSelectedExerciseId('');
    }
  }

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="section-kicker">{isEditing ? 'Redigera mall' : 'Ny mall'}</p>
          <h2>{isEditing ? 'Uppdatera träningspass' : 'Skapa träningspass'}</h2>
        </div>
        <Link className="ghost-button" to="/pass">
          Tillbaka
        </Link>
      </div>

      <form className="page-stack" onSubmit={handleSubmit}>
        <section className="card form-card">
          <label className="field">
            <span>Namn på pass</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Till exempel Överkropp A" required />
          </label>

          <label className="field">
            <span>Anteckningar</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Valfritt: tempo, upplägg eller annat som hjälper dig nästa gång."
            />
          </label>
        </section>

        <section className="card form-card">
          <div className="section-heading compact-heading">
            <div>
              <p className="section-kicker">Bygg innehåll</p>
              <h3>Lägg till övningar</h3>
            </div>
          </div>

          <div className="stacked-form-group">
            <div className="form-group-heading">
              <strong>Lägg till övning</strong>
              <p className="muted">Välj en befintlig övning eller skriv in en ny som ska skapas direkt.</p>
            </div>

            <div className="inline-form add-exercise-flow">
              <select value={selectedExerciseId} onChange={(event) => handleExistingExerciseChange(event.target.value)}>
                <option value="">Välj befintlig övning</option>
                {library.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>
            </div>

            <p className="form-divider" aria-hidden="true">
              eller
            </p>

            <div className="inline-form add-exercise-flow">
              <input
                value={newExerciseName}
                onChange={(event) => handleNewExerciseNameChange(event.target.value)}
                placeholder="Ange en ny övning här"
              />
            </div>

            <div>
              <button
                className="secondary-button"
                type="button"
                onClick={handleAddExercise}
                disabled={!selectedExerciseId && !newExerciseName.trim()}
              >
                Lägg till vald övning
              </button>
            </div>
          </div>

          <div className="card-list">
            {draftExercises.map((exercise, index) => (
              <article className="card nested-card" key={`${exercise.exerciseId}-${index}`}>
                <div className="card-row">
                  <strong>{exercise.exerciseName}</strong>
                  <div className="row-actions">
                    <button className="ghost-button" type="button" onClick={() => moveExercise(index, -1)}>
                      Upp
                    </button>
                    <button className="ghost-button" type="button" onClick={() => moveExercise(index, 1)}>
                      Ner
                    </button>
                    <button className="ghost-button danger" type="button" onClick={() => removeDraftExercise(index)}>
                      Ta bort
                    </button>
                  </div>
                </div>

                <div className="two-column-grid">
                  <label className="field">
                    <span>Standardantal set</span>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      inputMode="numeric"
                      value={exercise.defaultSets}
                      onChange={(event) => updateDraftExercise(index, { defaultSets: event.target.value })}
                      onBlur={(event) => updateDraftExercise(index, { defaultSets: String(normalizeDefaultSets(event.target.value)) })}
                    />
                  </label>

                  <label className="field">
                    <span>Notering</span>
                    <input
                      value={exercise.notes}
                      onChange={(event) => updateDraftExercise(index, { notes: event.target.value })}
                      placeholder="Valfritt"
                    />
                  </label>
                </div>
              </article>
            ))}
          </div>
        </section>

        {error ? <section className="card error-card">{error}</section> : null}

        <div className="sticky-actions">
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Sparar...' : isEditing ? 'Spara ändringar' : 'Skapa pass'}
          </button>
        </div>
      </form>
    </section>
  );
}
