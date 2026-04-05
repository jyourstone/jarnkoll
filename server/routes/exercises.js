import { Router } from 'express';
import { z } from 'zod';
import {
  createExercise,
  deleteExercise,
  getExerciseById,
  getExerciseTemplateUsageCount,
  listExercises,
  updateExercise,
} from '../db.js';

const router = Router();

const exerciseSchema = z.object({
  name: z.string().trim().min(1, 'Ange ett namn.').max(120, 'Namnet ar for langt.'),
});

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/', (_request, response) => {
  response.json(listExercises());
});

router.post('/', (request, response, next) => {
  try {
    const payload = exerciseSchema.parse(request.body);
    const exercise = createExercise(payload);
    response.status(201).json(exercise);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', (request, response, next) => {
  try {
    const id = parseId(request.params.id);
    if (!id) {
      return response.status(400).json({ message: 'Ogiltigt ovnings-id.' });
    }

    if (!getExerciseById(id)) {
      return response.status(404).json({ message: 'Ovningen hittades inte.' });
    }

    const payload = exerciseSchema.parse(request.body);
    const exercise = updateExercise(id, payload);
    response.json(exercise);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', (request, response) => {
  const id = parseId(request.params.id);
  if (!id) {
    return response.status(400).json({ message: 'Ogiltigt ovnings-id.' });
  }

  const exercise = getExerciseById(id);
  if (!exercise) {
    return response.status(404).json({ message: 'Ovningen hittades inte.' });
  }

  const usageCount = getExerciseTemplateUsageCount(id);
  if (usageCount > 0) {
    return response
      .status(409)
      .json({ message: 'Ovningen anvands fortfarande i ett eller flera traningspass och kan inte tas bort.' });
  }

  deleteExercise(id);
  response.status(204).send();
});

export default router;
