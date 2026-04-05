import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const dbPath = process.env.DB_PATH || path.join(dataDir, 'jarnkoll.db');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS exercises (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    name           TEXT NOT NULL UNIQUE COLLATE NOCASE,
    primary_metric TEXT NOT NULL DEFAULT 'weight',
    created_at     TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS workout_templates (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    notes      TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS template_exercises (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id  INTEGER NOT NULL,
    exercise_id  INTEGER NOT NULL,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    default_sets INTEGER NOT NULL DEFAULT 3,
    notes        TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE RESTRICT,
    UNIQUE(template_id, exercise_id)
  );

  CREATE TABLE IF NOT EXISTS workout_logs (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id            INTEGER,
    template_name_snapshot TEXT NOT NULL,
    performed_on           TEXT NOT NULL,
    notes                  TEXT NOT NULL DEFAULT '',
    created_at             TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS workout_log_exercises (
    id                     INTEGER PRIMARY KEY AUTOINCREMENT,
    log_id                 INTEGER NOT NULL,
    exercise_id            INTEGER,
    exercise_name_snapshot TEXT NOT NULL,
    sort_order             INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (log_id) REFERENCES workout_logs(id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    log_exercise_id INTEGER NOT NULL,
    set_number      INTEGER NOT NULL,
    weight          REAL NOT NULL DEFAULT 0,
    reps            INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (log_exercise_id) REFERENCES workout_log_exercises(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_logs_performed_on ON workout_logs(performed_on);
  CREATE INDEX IF NOT EXISTS idx_logs_template_id ON workout_logs(template_id);
  CREATE INDEX IF NOT EXISTS idx_log_exercises_exercise_id ON workout_log_exercises(exercise_id);
  CREATE INDEX IF NOT EXISTS idx_log_exercises_log_id ON workout_log_exercises(log_id);
  CREATE INDEX IF NOT EXISTS idx_workout_sets_log_exercise_id ON workout_sets(log_exercise_id);
  CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);
  CREATE INDEX IF NOT EXISTS idx_template_exercises_exercise_id ON template_exercises(exercise_id);
`);

function normalizeText(value) {
  return (value || '').trim();
}

function roundMetric(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function calculateStatsFromSets(sets) {
  return sets.reduce(
    (summary, current) => {
      const weight = Number(current.weight) || 0;
      const reps = Number(current.reps) || 0;
      const estimatedOneRepMax = weight > 0 && reps > 0 ? weight * (1 + reps / 30) : 0;

      if (weight > summary.maxWeight) {
        summary.maxWeight = weight;
      }

      if (estimatedOneRepMax > summary.bestEstimatedOneRepMax) {
        summary.bestEstimatedOneRepMax = estimatedOneRepMax;
        summary.bestSetLabel = weight > 0 && reps > 0 ? `${roundMetric(weight)} kg x ${reps}` : '';
      }

      summary.totalVolume += weight * reps;
      summary.setCount += 1;
      return summary;
    },
    {
      maxWeight: 0,
      totalVolume: 0,
      bestEstimatedOneRepMax: 0,
      bestSetLabel: '',
      setCount: 0,
    },
  );
}

function mapExercise(row) {
  return {
    id: row.id,
    name: row.name,
    primaryMetric: row.primary_metric,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    templateUsageCount: row.template_usage_count ?? 0,
  };
}

function mapTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    exerciseCount: row.exercise_count ?? 0,
    lastPerformedOn: row.last_performed_on ?? null,
  };
}

function mapTemplateExercise(row) {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    exerciseName: row.exercise_name,
    sortOrder: row.sort_order,
    defaultSets: row.default_sets,
    notes: row.notes,
  };
}

function mapSet(row) {
  return {
    id: row.id,
    setNumber: row.set_number,
    weight: roundMetric(row.weight),
    reps: row.reps,
  };
}

function mapLog(logRow, exerciseRows, setRows) {
  const setsByExerciseId = new Map();

  for (const row of setRows) {
    if (!setsByExerciseId.has(row.log_exercise_id)) {
      setsByExerciseId.set(row.log_exercise_id, []);
    }
    setsByExerciseId.get(row.log_exercise_id).push(mapSet(row));
  }

  const exercises = exerciseRows.map((row) => {
    const sets = setsByExerciseId.get(row.id) || [];
    const stats = calculateStatsFromSets(sets);
    return {
      id: row.id,
      exerciseId: row.exercise_id,
      exerciseNameSnapshot: row.exercise_name_snapshot,
      sortOrder: row.sort_order,
      sets,
      stats: {
        maxWeight: roundMetric(stats.maxWeight),
        totalVolume: roundMetric(stats.totalVolume),
        bestEstimatedOneRepMax: roundMetric(stats.bestEstimatedOneRepMax),
        bestSetLabel: stats.bestSetLabel,
        setCount: stats.setCount,
      },
    };
  });

  const overallStats = exercises.reduce(
    (summary, exercise) => {
      summary.totalVolume += exercise.stats.totalVolume;
      summary.bestEstimatedOneRepMax = Math.max(summary.bestEstimatedOneRepMax, exercise.stats.bestEstimatedOneRepMax);
      summary.exerciseCount += 1;
      summary.setCount += exercise.stats.setCount;
      return summary;
    },
    { totalVolume: 0, bestEstimatedOneRepMax: 0, exerciseCount: 0, setCount: 0 },
  );

  return {
    id: logRow.id,
    templateId: logRow.template_id,
    templateNameSnapshot: logRow.template_name_snapshot,
    performedOn: logRow.performed_on,
    notes: logRow.notes,
    createdAt: logRow.created_at,
    summary: {
      totalVolume: roundMetric(overallStats.totalVolume),
      bestEstimatedOneRepMax: roundMetric(overallStats.bestEstimatedOneRepMax),
      exerciseCount: overallStats.exerciseCount,
      setCount: overallStats.setCount,
    },
    exercises,
  };
}

export function listExercises() {
  return db
    .prepare(`
      SELECT
        e.*,
        (
          SELECT COUNT(*)
          FROM template_exercises te
          WHERE te.exercise_id = e.id
        ) AS template_usage_count
      FROM exercises e
      ORDER BY e.name COLLATE NOCASE ASC
    `)
    .all()
    .map(mapExercise);
}

export function getExerciseById(id) {
  const exercise = db
    .prepare(`
      SELECT
        e.*,
        (
          SELECT COUNT(*)
          FROM template_exercises te
          WHERE te.exercise_id = e.id
        ) AS template_usage_count
      FROM exercises e
      WHERE e.id = ?
    `)
    .get(id);

  return exercise ? mapExercise(exercise) : null;
}

export function createExercise({ name }) {
  const trimmed = normalizeText(name);
  const result = db.prepare('INSERT INTO exercises (name) VALUES (?)').run(trimmed);
  return getExerciseById(result.lastInsertRowid);
}

export function updateExercise(id, { name }) {
  db.prepare('UPDATE exercises SET name = ?, updated_at = datetime(\'now\') WHERE id = ?').run(normalizeText(name), id);
  return getExerciseById(id);
}

export function deleteExercise(id) {
  return db.prepare('DELETE FROM exercises WHERE id = ?').run(id);
}

export function getExerciseTemplateUsageCount(id) {
  return db.prepare('SELECT COUNT(*) AS count FROM template_exercises WHERE exercise_id = ?').get(id).count;
}

export function listTemplates() {
  return db
    .prepare(`
      SELECT
        t.*,
        COUNT(te.id) AS exercise_count,
        (
          SELECT wl.performed_on
          FROM workout_logs wl
          WHERE wl.template_id = t.id
          ORDER BY wl.performed_on DESC, wl.id DESC
          LIMIT 1
        ) AS last_performed_on
      FROM workout_templates t
      LEFT JOIN template_exercises te ON te.template_id = t.id
      GROUP BY t.id
      ORDER BY t.updated_at DESC, t.name COLLATE NOCASE ASC
    `)
    .all()
    .map(mapTemplate);
}

export function getTemplate(id) {
  const template = db.prepare('SELECT * FROM workout_templates WHERE id = ?').get(id);
  if (!template) {
    return null;
  }

  const exercises = db
    .prepare(`
      SELECT
        te.*,
        e.name AS exercise_name
      FROM template_exercises te
      JOIN exercises e ON e.id = te.exercise_id
      WHERE te.template_id = ?
      ORDER BY te.sort_order ASC, te.id ASC
    `)
    .all(id)
    .map(mapTemplateExercise);

  return {
    ...mapTemplate({
      ...template,
      exercise_count: exercises.length,
      last_performed_on: null,
    }),
    exercises,
  };
}

const saveTemplateTransaction = db.transaction((id, payload, isUpdate) => {
  const trimmedName = normalizeText(payload.name);
  const notes = normalizeText(payload.notes);

  let templateId = id;
  if (isUpdate) {
    const updateResult = db
      .prepare('UPDATE workout_templates SET name = ?, notes = ?, updated_at = datetime(\'now\') WHERE id = ?')
      .run(trimmedName, notes, id);
    if (updateResult.changes === 0) {
      throw new Error('Traningspasset hittades inte.');
    }

    db.prepare('DELETE FROM template_exercises WHERE template_id = ?').run(id);
  } else {
    const result = db
      .prepare('INSERT INTO workout_templates (name, notes, created_at, updated_at) VALUES (?, ?, datetime(\'now\'), datetime(\'now\'))')
      .run(trimmedName, notes);
    templateId = result.lastInsertRowid;
  }

  const insertExercise = db.prepare(`
    INSERT INTO template_exercises (template_id, exercise_id, sort_order, default_sets, notes)
    VALUES (?, ?, ?, ?, ?)
  `);

  payload.exercises.forEach((exercise, index) => {
    insertExercise.run(templateId, exercise.exerciseId, index, exercise.defaultSets, normalizeText(exercise.notes));
  });

  return templateId;
});

export function createTemplate(payload) {
  const templateId = saveTemplateTransaction(null, payload, false);
  return getTemplate(templateId);
}

export function updateTemplate(id, payload) {
  const templateId = saveTemplateTransaction(id, payload, true);
  return getTemplate(templateId);
}

export function deleteTemplate(id) {
  return db.prepare('DELETE FROM workout_templates WHERE id = ?').run(id);
}

export function listLogs(limit = 50) {
  return db
    .prepare(`
      SELECT
        wl.id,
        wl.template_id,
        wl.template_name_snapshot,
        wl.performed_on,
        wl.created_at,
        COALESCE(SUM(ws.weight * ws.reps), 0) AS total_volume,
        COALESCE(MAX(ws.weight * (1 + ws.reps / 30.0)), 0) AS best_estimated_one_rep_max,
        COUNT(ws.id) AS set_count,
        COUNT(DISTINCT wle.id) AS exercise_count
      FROM workout_logs wl
      LEFT JOIN workout_log_exercises wle ON wle.log_id = wl.id
      LEFT JOIN workout_sets ws ON ws.log_exercise_id = wle.id
      GROUP BY wl.id
      ORDER BY wl.performed_on DESC, wl.id DESC
      LIMIT ?
    `)
    .all(limit)
    .map((row) => ({
      id: row.id,
      templateId: row.template_id,
      templateNameSnapshot: row.template_name_snapshot,
      performedOn: row.performed_on,
      createdAt: row.created_at,
      totalVolume: roundMetric(row.total_volume),
      bestEstimatedOneRepMax: roundMetric(row.best_estimated_one_rep_max),
      setCount: row.set_count,
      exerciseCount: row.exercise_count,
    }));
}

export function getLog(id) {
  const logRow = db.prepare('SELECT * FROM workout_logs WHERE id = ?').get(id);
  if (!logRow) {
    return null;
  }

  const exerciseRows = db
    .prepare('SELECT * FROM workout_log_exercises WHERE log_id = ? ORDER BY sort_order ASC, id ASC')
    .all(id);

  if (exerciseRows.length === 0) {
    return mapLog(logRow, [], []);
  }

  const setRows = db
    .prepare(`
      SELECT ws.*, wle.id AS log_exercise_id
      FROM workout_sets ws
      JOIN workout_log_exercises wle ON wle.id = ws.log_exercise_id
      WHERE wle.log_id = ?
      ORDER BY wle.sort_order ASC, ws.set_number ASC, ws.id ASC
    `)
    .all(id);

  return mapLog(logRow, exerciseRows, setRows);
}

const saveLogTransaction = db.transaction((payload) => {
  const logResult = db
    .prepare(`
      INSERT INTO workout_logs (template_id, template_name_snapshot, performed_on, notes, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `)
    .run(payload.templateId ?? null, normalizeText(payload.templateNameSnapshot), payload.performedOn, normalizeText(payload.notes));

  const logId = logResult.lastInsertRowid;
  const insertExercise = db.prepare(`
    INSERT INTO workout_log_exercises (log_id, exercise_id, exercise_name_snapshot, sort_order)
    VALUES (?, ?, ?, ?)
  `);
  const insertSet = db.prepare(`
    INSERT INTO workout_sets (log_exercise_id, set_number, weight, reps)
    VALUES (?, ?, ?, ?)
  `);

  payload.exercises.forEach((exercise, exerciseIndex) => {
    const exerciseResult = insertExercise.run(
      logId,
      exercise.exerciseId ?? null,
      normalizeText(exercise.exerciseNameSnapshot),
      exercise.sortOrder ?? exerciseIndex,
    );

    exercise.sets.forEach((setItem, setIndex) => {
      insertSet.run(
        exerciseResult.lastInsertRowid,
        setItem.setNumber ?? setIndex + 1,
        roundMetric(setItem.weight),
        Math.round(Number(setItem.reps) || 0),
      );
    });
  });

  return logId;
});

export function createLog(payload) {
  const logId = saveLogTransaction(payload);
  return getLog(logId);
}

export function getLatestTemplateLog(templateId, beforeDate) {
  const row = db
    .prepare(`
      SELECT id
      FROM workout_logs
      WHERE template_id = ?
        AND (? IS NULL OR performed_on <= ?)
      ORDER BY performed_on DESC, id DESC
      LIMIT 1
    `)
    .get(templateId, beforeDate ?? null, beforeDate ?? null);

  return row ? getLog(row.id) : null;
}

export function buildComparisonMaps(log) {
  const byExerciseId = Object.create(null);
  const byExerciseName = Object.create(null);

  if (!log) {
    return { byExerciseId, byExerciseName };
  }

  log.exercises.forEach((exercise) => {
    const entry = {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.exerciseNameSnapshot,
      performedOn: log.performedOn,
      maxWeight: exercise.stats.maxWeight,
      totalVolume: exercise.stats.totalVolume,
      bestEstimatedOneRepMax: exercise.stats.bestEstimatedOneRepMax,
      bestSetLabel: exercise.stats.bestSetLabel,
      setCount: exercise.stats.setCount,
    };

    if (exercise.exerciseId) {
      byExerciseId[String(exercise.exerciseId)] = entry;
    }

    byExerciseName[exercise.exerciseNameSnapshot.toLowerCase()] = entry;
  });

  return { byExerciseId, byExerciseName };
}

export function getTemplateLogContext(templateId, beforeDate) {
  const template = getTemplate(templateId);
  if (!template) {
    return null;
  }

  const previousLog = getLatestTemplateLog(templateId, beforeDate);
  const comparison = buildComparisonMaps(previousLog);

  return {
    template,
    previousLog,
    comparisonByExerciseId: comparison.byExerciseId,
    comparisonByExerciseName: comparison.byExerciseName,
  };
}

export function getExerciseProgress(exerciseId) {
  const exercise = getExerciseById(exerciseId);
  if (!exercise) {
    return null;
  }

  const rows = db
    .prepare(`
      SELECT
        wl.id AS log_id,
        wl.performed_on,
        wl.template_name_snapshot,
        ws.weight,
        ws.reps
      FROM workout_logs wl
      JOIN workout_log_exercises wle ON wle.log_id = wl.id
      JOIN workout_sets ws ON ws.log_exercise_id = wle.id
      WHERE wle.exercise_id = ?
      ORDER BY wl.performed_on ASC, wl.id ASC, ws.set_number ASC, ws.id ASC
    `)
    .all(exerciseId);

  const grouped = new Map();

  rows.forEach((row) => {
    if (!grouped.has(row.log_id)) {
      grouped.set(row.log_id, {
        logId: row.log_id,
        performedOn: row.performed_on,
        templateName: row.template_name_snapshot,
        sets: [],
      });
    }

    grouped.get(row.log_id).sets.push({
      weight: row.weight,
      reps: row.reps,
    });
  });

  return {
    exercise,
    points: Array.from(grouped.values()).map((entry) => {
      const stats = calculateStatsFromSets(entry.sets);
      return {
        logId: entry.logId,
        performedOn: entry.performedOn,
        templateName: entry.templateName,
        maxWeight: roundMetric(stats.maxWeight),
        totalVolume: roundMetric(stats.totalVolume),
        bestEstimatedOneRepMax: roundMetric(stats.bestEstimatedOneRepMax),
      };
    }),
  };
}

export function getDashboardSummary() {
  const counts = {
    templates: db.prepare('SELECT COUNT(*) AS count FROM workout_templates').get().count,
    exercises: db.prepare('SELECT COUNT(*) AS count FROM exercises').get().count,
    logs: db.prepare('SELECT COUNT(*) AS count FROM workout_logs').get().count,
  };

  const topExercises = db
    .prepare(`
      SELECT
        e.id AS exercise_id,
        e.name AS exercise_name,
        COUNT(wle.id) AS entries,
        MAX(wl.performed_on) AS latest_performed_on
      FROM exercises e
      JOIN workout_log_exercises wle ON wle.exercise_id = e.id
      JOIN workout_logs wl ON wl.id = wle.log_id
      GROUP BY e.id, e.name
      ORDER BY entries DESC, latest_performed_on DESC
      LIMIT 5
    `)
    .all()
    .map((row) => ({
      exerciseId: row.exercise_id,
      exerciseName: row.exercise_name,
      entries: row.entries,
      latestPerformedOn: row.latest_performed_on,
    }));

  return {
    counts,
    recentLogs: listLogs(6),
    topExercises,
  };
}

export default db;
