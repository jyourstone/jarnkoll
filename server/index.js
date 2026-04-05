import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ZodError } from 'zod';
import { getDashboardSummary } from './db.js';
import exercisesRouter from './routes/exercises.js';
import logsRouter from './routes/logs.js';
import progressRouter from './routes/progress.js';
import templatesRouter from './routes/templates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const hasBuild = fs.existsSync(path.join(distDir, 'index.html'));
const port = Number(process.env.PORT) || 3000;

const app = express();

app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_request, response) => {
  response.json({
    status: 'ok',
    app: 'Järnkoll',
    mode: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/dashboard', (_request, response) => {
  response.json(getDashboardSummary());
});

app.use('/api/progress', progressRouter);
app.use('/api/exercises', exercisesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/logs', logsRouter);

if (hasBuild) {
  app.use(express.static(distDir));
  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      return next();
    }

    response.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.get('/', (_request, response) => {
    response.json({
      app: 'Järnkoll API',
      message: 'Client build is missing. Run "npm run dev" for local development or "npm run build" before starting production mode.',
    });
  });
}

app.use((request, response) => {
  response.status(404).json({ message: `Kunde inte hitta ${request.method} ${request.path}` });
});

app.use((error, _request, response, _next) => {
  if (error instanceof ZodError) {
    return response.status(400).json({
      message: 'Ogiltig data skickades till servern.',
      issues: error.flatten(),
    });
  }

  if (error?.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return response.status(409).json({ message: 'Posten finns redan.' });
  }

  console.error(error);
  response.status(500).json({ message: 'Nagot gick fel pa servern.' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Järnkoll listening on http://0.0.0.0:${port}`);
});
