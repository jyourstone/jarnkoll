import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetailPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const LogDetailPage = lazy(() => import('./pages/LogDetailPage'));
const LogWorkoutPage = lazy(() => import('./pages/LogWorkoutPage'));
const SessionEditorPage = lazy(() => import('./pages/SessionEditorPage'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense
        fallback={
          <div className="app-shell">
            <section className="card empty-card">Laddar vy...</section>
          </div>
        }
      >
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pass" element={<SessionsPage />} />
            <Route path="/pass/nytt" element={<SessionEditorPage />} />
            <Route path="/pass/:templateId" element={<SessionEditorPage />} />
            <Route path="/logga" element={<LogWorkoutPage />} />
            <Route path="/logga/pass/:templateId" element={<LogWorkoutPage />} />
            <Route path="/logga/klona/:logId" element={<LogWorkoutPage />} />
            <Route path="/historik" element={<HistoryPage />} />
            <Route path="/historik/:logId" element={<LogDetailPage />} />
            <Route path="/ovningar/:exerciseId" element={<ExerciseDetailPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
