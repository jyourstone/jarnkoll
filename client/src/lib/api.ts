import type {
  DashboardSummary,
  Exercise,
  ExerciseProgress,
  TemplateLogContext,
  WorkoutLog,
  WorkoutLogSummary,
  WorkoutTemplate,
} from './types';

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.message || 'Nagot gick fel.');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboard: () => request<DashboardSummary>('/api/dashboard'),
  listExercises: () => request<Exercise[]>('/api/exercises'),
  createExercise: (payload: { name: string }) =>
    request<Exercise>('/api/exercises', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listTemplates: () => request<WorkoutTemplate[]>('/api/templates'),
  getTemplate: (templateId: number) => request<WorkoutTemplate & { exercises: any[] }>(`/api/templates/${templateId}`),
  createTemplate: (payload: unknown) =>
    request<WorkoutTemplate>(`/api/templates`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateTemplate: (templateId: number, payload: unknown) =>
    request<WorkoutTemplate>(`/api/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getTemplateLogContext: (templateId: number, date?: string) => {
    const params = new URLSearchParams();
    if (date) {
      params.set('date', date);
    }

    const query = params.toString();
    return request<TemplateLogContext>(`/api/templates/${templateId}/log-context${query ? `?${query}` : ''}`);
  },
  listLogs: (limit = 50) => request<WorkoutLogSummary[]>(`/api/logs?limit=${limit}`),
  getLog: (logId: number) => request<WorkoutLog>(`/api/logs/${logId}`),
  createLog: (payload: unknown) =>
    request<WorkoutLog>('/api/logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getExerciseProgress: (exerciseId: number) => request<ExerciseProgress>(`/api/progress/exercises/${exerciseId}`),
};
