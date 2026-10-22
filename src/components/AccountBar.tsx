import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Gavel, LockKeyhole, Mail, UserRound, X } from 'lucide-react';
import { useAuction } from '../context/useAuction';
import { GoogleSignIn } from './GoogleSignIn';

export function AccountBar() {
  const { user, authenticate, authenticateGoogle } = useAuction();
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const open = () => { setRegister(false); setMessage(''); setShowPassword(false); setVisible(true); };
    window.addEventListener('auction-sign-in', open);
    return () => window.removeEventListener('auction-sign-in', open);
  }, []);
  useEffect(() => {
    if (!visible || user.id) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVisible(false);
      if (event.key !== 'Tab') return;
      const elements = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input') || []);
      const first = elements[0]; const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); previousFocus?.focus(); };
  }, [visible, user.id]);
  if (user.id || !visible) return null;
  return <div className="auth-backdrop" onClick={event => { if (event.target === event.currentTarget) setVisible(false); }}>
    <div className="auth-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="auth-close" aria-label="Close sign in" onClick={() => setVisible(false)}><X size={20}/></button>
      <div className="auth-brand"><Gavel size={24}/></div>
      <span className="auth-eyebrow">GOOD FINDS START HERE</span>
      <h2 id="auth-title">{register ? 'Make it yours.' : 'Welcome back.'}</h2>
      <p className="auth-description">{register ? 'Join to save your finds, bid, and sell.' : 'Your watchlist. Your bids. Your next great find.'}</p>
      <div className="auth-tabs" role="group" aria-label="Account options">
        <button type="button" aria-pressed={!register} className={!register ? 'active' : ''} disabled={busy} onClick={() => { setRegister(false); setMessage(''); setShowPassword(false); }}>Sign in</button>
        <button type="button" aria-pressed={register} className={register ? 'active' : ''} disabled={busy} onClick={() => { setRegister(true); setMessage(''); setShowPassword(false); }}>Create account</button>
      </div>
      <GoogleSignIn busy={busy} onCredential={async credential => {
        if (busy) return;
        setBusy(true); setMessage('');
        try {
          const result = await authenticateGoogle(credential);
          if (result.success) setVisible(false); else setMessage(result.message);
        } finally { setBusy(false); }
      }}/>
      <form key={register ? 'register' : 'login'} onSubmit={async event => {
        event.preventDefault(); if (busy) return; setBusy(true); setMessage('');
        const fields = new FormData(event.currentTarget);
        try {
          const result = await authenticate(String(fields.get('email')).trim(), String(fields.get('password')), register ? String(fields.get('name')).trim() : undefined);
          if (result.success) setVisible(false); else setMessage(result.message);
        } finally { setBusy(false); }
      }}>
        {register && <label className="auth-field">Full name<div><UserRound size={18}/><input name="name" autoComplete="name" placeholder="Your name" required maxLength={100}/></div></label>}
        <label className="auth-field">Email address<div><Mail size={18}/><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div></label>
        <label className="auth-field">Password<div><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 8 characters' : 'Your password'} required minLength={register ? 8 : undefined}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
        {message && <p className="auth-error" role="alert">{message}</p>}
        <button className="auth-submit" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}<ArrowRight size={18}/></button>
      </form>
      <button className="auth-browse" onClick={() => setVisible(false)}>Keep exploring as a guest</button>
      <p className="auth-note">Browse freely. Sign in when you find something you love.</p>
    </div>
  </div>;
}
