import { Router } from 'express';
import { z } from 'zod';
import { createLog, getLog, listLogs } from '../db.js';

const router = Router();

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
  performedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Datum maste anges som YYYY-MM-DD.'),
  notes: z.string().trim().max(1000).default(''),
  exercises: z.array(logExerciseSchema).min(1).max(30),
});

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/', (request, response) => {
  const limit = request.query.limit ? Number(request.query.limit) : 50;
  response.json(listLogs(Number.isFinite(limit) ? Math.min(limit, 200) : 50));
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
