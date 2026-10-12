import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const ready = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const done = () => { setInstalled(true); setPrompt(null); setShowHelp(false); };
    const connection = () => setOnline(navigator.onLine);
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', done);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', done);
      window.removeEventListener('online', connection);
      window.removeEventListener('offline', connection);
    };
  }, []);
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return <>
    {!online && <p className="app-offline-notice" role="status">You’re offline. Reconnect to see live prices and place bids.</p>}
    {!installed && <div className="app-install">
      <button type="button" className="app-install-button" disabled={busy} aria-expanded={showHelp} aria-controls="app-install-help" onClick={async () => {
        if (!prompt) { setShowHelp(value => !value); return; }
        setBusy(true);
        try {
          await prompt.prompt();
          await prompt.userChoice;
          setPrompt(null);
        } catch { setShowHelp(true); }
        finally { setBusy(false); }
      }}><Download size={16}/>Install Auction Pro</button>
      {showHelp && <div id="app-install-help" className="app-install-help">
        <Smartphone size={20}/>
        <p>{!window.isSecureContext ? 'Open Auction Pro at its secure HTTPS address to install it on your phone.' : ios ? 'On iPhone or iPad, open this page in Safari, tap Share, then Add to Home Screen. Enable Open as Web App if offered.' : 'Open this page in Chrome or Edge, then choose Install app or Add to Home screen from the browser menu. If installation is unavailable, reload after your first visit and try again.'}</p>
      </div>}
    </div>}
  </>;
}
