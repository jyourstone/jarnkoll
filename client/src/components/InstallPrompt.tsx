import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jarnkoll-install-hint-dismissed';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function shouldShowInstallHint() {
  const ua = navigator.userAgent.toLowerCase();
  const isIphone = /iphone/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return isIphone && isSafari && !isStandalone();
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = window.localStorage.getItem(STORAGE_KEY) === 'true';
    setVisible(!dismissed && shouldShowInstallHint());
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <section className="install-hint card">
      <div>
        <p className="section-kicker">Tips för iPhone</p>
        <h2>Lägg till på hemskärmen</h2>
        <p>Öppna dela-menyn i Safari och välj &quot;Lägg till på hemskärmen&quot; för en mer app-lik känsla.</p>
      </div>
      <button
        type="button"
        className="ghost-button"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, 'true');
          setVisible(false);
        }}
      >
        Dolj
      </button>
    </section>
  );
}
