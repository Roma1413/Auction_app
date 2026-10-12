import { useEffect, useRef, useState } from 'react';

type GoogleIdentity = {
  initialize: (options: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: { theme: string; size: string; text: string; width: number }) => void;
};
declare global { interface Window { google?: { accounts: { id: GoogleIdentity } } } }

let loading: Promise<void> | undefined;
function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { script.remove(); loading = undefined; reject(new Error('Google sign-in could not load. Please reopen sign-in to try again.')); };
    document.head.appendChild(script);
  });
  return loading;
}

export function GoogleSignIn({ onCredential, busy }: { onCredential: (credential: string) => void; busy: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadGoogle().then(() => {
      if (cancelled || !container.current || !window.google) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: response => { if (!cancelled) callback.current(response.credential); } });
      window.google.accounts.id.renderButton(container.current, { theme: 'outline', size: 'large', text: 'continue_with', width: Math.min(container.current.clientWidth, 400) });
    }).catch(error => { if (!cancelled) setError(error.message); });
    return () => { cancelled = true; };
  }, [clientId]);
  return <div className="auth-google">
    {clientId ? <div ref={container} inert={busy} aria-busy={busy}/> : <button type="button" disabled>Continue with Google (setup required)</button>}
    {error && <p className="auth-error" role="alert">{error}</p>}
    <div className="auth-divider"><span>or continue with email</span></div>
  </div>;
}
