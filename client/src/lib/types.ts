export interface Exercise {
  id: number;
  name: string;
  primaryMetric: string;
  createdAt: string;
  updatedAt: string;
  templateUsageCount: number;
}

export interface TemplateExercise {
  id: number;
  exerciseId: number;
  exerciseName: string;
  sortOrder: number;
  defaultSets: number;
  notes: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  exerciseCount: number;
  lastPerformedOn: string | null;
  exercises?: TemplateExercise[];
}

export interface SetEntry {
  id?: number;
  setNumber: number;
  weight: number;
  reps: number;
}

export interface ExerciseStats {
  maxWeight: number;
  totalVolume: number;
  bestEstimatedOneRepMax: number;
  bestSetLabel: string;
  setCount: number;
}

export interface WorkoutLogExercise {
  id: number;
  exerciseId: number | null;
  exerciseNameSnapshot: string;
  sortOrder: number;
  sets: SetEntry[];
  stats: ExerciseStats;
}

export interface WorkoutLogSummary {
  id: number;
  templateId: number | null;
  templateNameSnapshot: string;
  performedOn: string;
  createdAt: string;
  totalVolume: number;
  bestEstimatedOneRepMax: number;
  setCount: number;
  exerciseCount: number;
}

export interface WorkoutLog extends WorkoutLogSummary {
  notes: string;
  summary: {
    totalVolume: number;
    bestEstimatedOneRepMax: number;
    exerciseCount: number;
    setCount: number;
  };
  exercises: WorkoutLogExercise[];
}

export interface ComparisonEntry extends ExerciseStats {
  exerciseId: number | null;
  exerciseName: string;
  performedOn: string;
}

export interface TemplateLogContext {
  template: WorkoutTemplate & { exercises: TemplateExercise[] };
  previousLog: WorkoutLog | null;
  comparisonByExerciseId: Record<string, ComparisonEntry>;
  comparisonByExerciseName: Record<string, ComparisonEntry>;
}

export interface DashboardSummary {
  counts: {
    templates: number;
    exercises: number;
    logs: number;
  };
  recentLogs: WorkoutLogSummary[];
  topExercises: Array<{
    exerciseId: number;
    exerciseName: string;
    entries: number;
    latestPerformedOn: string;
  }>;
}

export interface ExerciseProgress {
  exercise: Exercise;
  points: Array<{
    logId: number;
    performedOn: string;
    templateName: string;
    maxWeight: number;
    totalVolume: number;
    bestEstimatedOneRepMax: number;
  }>;
}
