import { Router } from 'express';
import { z } from 'zod';
import { createLog, getLog, listLogs } from '../db.js';

const router = Router();

function isValidCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const setSchema = z.object({
  setNumber: z.number().int().min(1).max(30),
  weight: z.number().min(0).max(2000),
  reps: z.number().int().min(0).max(250),
});

const logExerciseSchema = z.object({
  exerciseId: z.number().int().positive().nullable().optional(),
  exerciseNameSnapshot: z.string().trim().min(1).max(120),
  sortOrder: z.number().int().min(0).max(100).default(0),
  sets: z.array(setSchema).min(1).max(30),
});

const logSchema = z.object({
  templateId: z.number().int().positive().nullable().optional(),
  templateNameSnapshot: z.string().trim().min(1).max(120),
  performedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum maste anges som YYYY-MM-DD.')
    .refine(isValidCalendarDate, 'Datumet maste vara ett riktigt kalenderdatum.'),
  notes: z.string().trim().max(1000).default(''),
  exercises: z.array(logExerciseSchema).min(1).max(30),
});

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/', (request, response) => {
  const rawLimit = request.query.limit ? Number(request.query.limit) : 50;
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(Math.floor(rawLimit), 200)) : 50;
  response.json(listLogs(limit));
});

router.get('/:id', (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ message: 'Ogiltigt logg-id.' });
  }

  const log = getLog(id);
  if (!log) {
    return response.status(404).json({ message: 'Loggen hittades inte.' });
  }

  response.json(log);
});

router.post('/', (request, response, next) => {
  try {
    const payload = logSchema.parse(request.body);
    const log = createLog(payload);
    response.status(201).json(log);
  } catch (error) {
    next(error);
  }
});

export default router;
