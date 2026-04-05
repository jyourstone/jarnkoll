import { Router } from 'express';
import { z } from 'zod';
import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  getTemplateLogContext,
  listTemplates,
  updateTemplate,
} from '../db.js';

const router = Router();

const templateExerciseSchema = z.object({
  exerciseId: z.number().int().positive(),
  defaultSets: z.number().int().min(1).max(12),
  notes: z.string().trim().max(280).default(''),
});

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Ange namn pa passet.').max(120, 'Namnet ar for langt.'),
  notes: z.string().trim().max(600).default(''),
  exercises: z.array(templateExerciseSchema).min(1, 'Lagg till minst en ovning.').max(24),
});

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateDuplicateExercises(exercises) {
  const seen = new Set();
  for (const exercise of exercises) {
    if (seen.has(exercise.exerciseId)) {
      return false;
    }
    seen.add(exercise.exerciseId);
  }
  return true;
}

router.get('/', (_request, response) => {
  response.json(listTemplates());
});

router.get('/:id/log-context', (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ message: 'Ogiltigt pass-id.' });
  }

  const date = request.query.date?.toString();
  if (date && !isoDatePattern.test(date)) {
    return response.status(400).json({ message: 'Datum maste anges som YYYY-MM-DD.' });
  }

  const context = getTemplateLogContext(id, date);
  if (!context) {
    return response.status(404).json({ message: 'Traningspasset hittades inte.' });
  }

  response.json(context);
});

router.get('/:id', (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ message: 'Ogiltigt pass-id.' });
  }

  const template = getTemplate(id);
  if (!template) {
    return response.status(404).json({ message: 'Traningspasset hittades inte.' });
  }

  response.json(template);
});

router.post('/', (request, response, next) => {
  try {
    const payload = templateSchema.parse(request.body);
    if (!validateDuplicateExercises(payload.exercises)) {
      return response.status(400).json({ message: 'Samma ovning kan bara laggas till en gang per pass.' });
    }

    const template = createTemplate(payload);
    response.status(201).json(template);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (request, response, next) => {
  try {
    const id = parseId(request.params.id);
    if (!id) {
      return response.status(400).json({ message: 'Ogiltigt pass-id.' });
    }

    if (!getTemplate(id)) {
      return response.status(404).json({ message: 'Traningspasset hittades inte.' });
    }

    const payload = templateSchema.parse(request.body);
    if (!validateDuplicateExercises(payload.exercises)) {
      return response.status(400).json({ message: 'Samma ovning kan bara laggas till en gang per pass.' });
    }

    const template = updateTemplate(id, payload);
    response.json(template);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ message: 'Ogiltigt pass-id.' });
  }

  if (!getTemplate(id)) {
    return response.status(404).json({ message: 'Traningspasset hittades inte.' });
  }

  deleteTemplate(id);
  response.status(204).send();
});

export default router;
