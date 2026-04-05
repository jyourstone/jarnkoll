import { Router } from 'express';
import { getExerciseProgress } from '../db.js';

const router = Router();

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

router.get('/exercises/:exerciseId', (request, response) => {
  const exerciseId = parseId(request.params.exerciseId);
  if (!exerciseId) {
    return response.status(400).json({ message: 'Ogiltigt ovnings-id.' });
  }

  const progress = getExerciseProgress(exerciseId);
  if (!progress) {
    return response.status(404).json({ message: 'Ovningen hittades inte.' });
  }

  response.json(progress);
});

export default router;
