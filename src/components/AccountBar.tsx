import { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Gavel, Heart, LockKeyhole, Mail, Sparkles, UserRound, X, LogOut } from 'lucide-react';
import { useAuction } from '../context/AuctionContext';

export function AccountBar() {
  const { user, authenticate, logout } = useAuction();
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    const open = () => { setVisible(true); requestAnimationFrame(() => document.querySelector('.account-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); };
    window.addEventListener('auction-sign-in', open);
    return () => window.removeEventListener('auction-sign-in', open);
  }, []);
  if (user.id) return <div className="max-w-7xl mx-auto w-full px-6 py-4 flex items-center justify-between text-sm"><span>Good to see you, <strong>{user.name.split(' ')[0]}</strong>. Find your next favorite.</span><button className="flex items-center gap-2 text-slate-500 hover:text-slate-900" onClick={logout}><LogOut size={15}/> Sign out</button></div>;
  if (!visible) return <div className="max-w-7xl mx-auto w-full px-6 py-4 flex flex-wrap gap-3 justify-between text-sm"><span>Something great is waiting to be found.</span><button className="font-semibold text-blue-700" onClick={() => setVisible(true)}>Sign in or create an account <ArrowRight className="inline ml-2" size={15}/></button></div>;
  return <section className="account-section" aria-label="Your Auction account">
    <div className="account-story">
      <span className="account-eyebrow"><Sparkles size={14}/> A LITTLE CURIOSITY. A GREAT FIND.</span>
      <h1>Your next great<br/>find starts <em>here.</em></h1>
      <p>From everyday essentials to the one you’ve been searching for. Make it yours.</p>
      <div className="account-perks"><span><Gavel size={17}/> Join the bidding</span><span><Heart size={17}/> Save your favorites</span></div>
      <div className="account-art" aria-hidden="true"><div className="art-orbit"/><div className="art-card"><span className="art-label">THE FIND OF THE DAY</span><Gavel size={58} strokeWidth={1.2}/><span>Great things.<br/><strong>Second beginnings.</strong></span><span className="art-tag">YOURS TO DISCOVER ↗</span></div><div className="art-sticker"><Sparkles size={18}/> Worth the search.</div></div>
      <span className="account-story-foot">BUY WHAT YOU LOVE. SELL WHAT’S NEXT.</span>
    </div>
    <div className="account-form-side">
      <button className="account-dismiss" aria-label="Browse without signing in" onClick={() => setVisible(false)}><X size={20}/></button>
      <div className="account-form-wrap">
        <span className="account-overline">YOUR AUCTION PRO ACCOUNT</span>
        <h2>{register ? 'A world of finds awaits.' : 'Welcome back.'}</h2>
        <p className="account-subtitle">{register ? 'Create an account and make your first discovery.' : 'Sign in to pick up where you left off.'}</p>
        <div className="account-tabs"><button type="button" className={!register ? 'active' : ''} onClick={() => {setRegister(false);setMessage('');}}>Sign in</button><button type="button" className={register ? 'active' : ''} onClick={() => {setRegister(true);setMessage('');}}>Create account</button></div>
        <form onSubmit={async event => {
          event.preventDefault(); setBusy(true); setMessage('');
          const fields = new FormData(event.currentTarget);
          const result = await authenticate(String(fields.get('email')).trim(), String(fields.get('password')), register ? String(fields.get('name')).trim() : undefined);
          setMessage(result.success ? '' : result.message); setBusy(false);
        }}>
          {register && <label className="account-field">Your name<div><UserRound size={18}/><input name="name" autoComplete="name" placeholder="First and last name" required maxLength={100}/></div></label>}
          <label className="account-field">Email address<div><Mail size={18}/><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required/></div></label>
          <label className="account-field">Password<div><LockKeyhole size={18}/><input name="password" type={showPassword ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 8 characters' : 'Enter your password'} required minLength={register ? 8 : undefined}/><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label>
          {message && <p className="account-error" role="alert">{message}</p>}
          <button className="account-submit" disabled={busy}>{busy ? 'One moment…' : register ? 'Create my account' : 'Sign in'}<ArrowRight size={18}/></button>
        </form>
        <button className="account-browse" onClick={() => setVisible(false)}>Just browsing? Explore the marketplace <ArrowRight size={14}/></button>
        <div className="account-note"><LockKeyhole size={14}/><span>Your favorites, bids, and listings. All in one place.</span></div>
      </div>
    </div>
  </section>;
}
