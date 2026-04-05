interface CelebrationOverlayProps {
  active: boolean;
  message: string;
}

export default function CelebrationOverlay({ active, message }: CelebrationOverlayProps) {
  if (!active) {
    return null;
  }

  return (
    <div className="celebration-overlay" aria-live="polite">
      <div className="celebration-burst" />
      <div className="celebration-card">
        <span className="section-kicker">Ny toppnotering</span>
        <strong>{message}</strong>
      </div>
    </div>
  );
}
