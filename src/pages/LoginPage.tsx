import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { ManualLogo } from '@/components/ui/ManualLogo';
import { cn } from '@/lib/utils';

type Mode = 'signin' | 'signup' | 'magic';

export function LoginPage() {
  const navigate = useNavigate();
  const { signInWithPassword, signUpWithPassword, signInWithMagicLink, configured, bee } =
    useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  if (bee) {
    navigate('/profile');
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!handle.trim()) {
          setError('Handle is required');
          return;
        }
        const { error } = await signUpWithPassword(email, password, handle.trim().toLowerCase());
        if (error) setError(error.message);
        else navigate('/profile');
      } else if (mode === 'signin') {
        const { error } = await signInWithPassword(email, password);
        if (error) setError(error.message);
        else navigate('/profile');
      } else if (mode === 'magic') {
        const { error } = await signInWithMagicLink(email);
        if (error) setError(error.message);
        else setMagicSent(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <ManualLogo size={48} />
        </div>
        <h1 className="font-display text-3xl font-semibold text-text-silver-bright">
          {mode === 'signup' ? 'Become a Bee' : 'Welcome back, Bee'}
        </h1>
        <p
          className="mt-2 font-mono text-text-muted"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          {mode === 'signup'
            ? 'One identity · every pillar'
            : 'Sign in to contribute sources'}
        </p>
      </div>

      {!configured && (
        <div className="mb-6 rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
          <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
            Supabase not yet configured. Set <code className="font-mono">VITE_SUPABASE_URL</code>{' '}
            and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}

      {/* Mode tabs */}
      <div className="mb-6 flex gap-0.5 rounded-md border border-border bg-bg-elevated p-0.5">
        <ModeTab active={mode === 'signin'} onClick={() => setMode('signin')}>
          Sign in
        </ModeTab>
        <ModeTab active={mode === 'signup'} onClick={() => setMode('signup')}>
          Sign up
        </ModeTab>
        <ModeTab active={mode === 'magic'} onClick={() => setMode('magic')}>
          Magic link
        </ModeTab>
      </div>

      {magicSent && mode === 'magic' ? (
        <div className="rounded-lg border border-kettle-sourced/30 bg-kettle-sourced/10 p-4 text-center">
          <Sparkles size={24} className="mx-auto mb-2 text-kettle-sourced" />
          <p className="text-text-silver-bright">Check your email</p>
          <p className="mt-1 text-text-dim" style={{ fontSize: '12px' }}>
            Magic link sent to {email}
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Field
              label="Handle"
              icon={<User size={14} />}
              value={handle}
              onChange={setHandle}
              placeholder="fnulnu"
              hint="Your unique Bee identifier"
              autoComplete="username"
              required
            />
          )}

          <Field
            label="Email"
            icon={<Mail size={14} />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@domain"
            autoComplete="email"
            required
          />

          {mode !== 'magic' && (
            <Field
              label="Password"
              icon={<Lock size={14} />}
              type="password"
              value={password}
              onChange={setPassword}
              placeholder={mode === 'signup' ? 'min 8 characters' : ''}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={mode === 'signup' ? 8 : undefined}
            />
          )}

          {error && (
            <div className="rounded-md border border-kettle-unsourced/30 bg-kettle-unsourced/10 p-3">
              <p className="text-kettle-unsourced" style={{ fontSize: '12px' }}>
                {error}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !configured}
            className={cn(
              'w-full rounded-md border border-text-silver/30 bg-bg-elevated py-2.5 font-medium text-text-silver-bright',
              'transition-all hover:border-text-silver/60 hover:bg-panel-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {loading ? '...' : mode === 'signup' ? 'Join the swarm' : mode === 'magic' ? 'Send magic link' : 'Sign in'}
          </button>
        </form>
      )}

      <div className="mt-8 text-center">
        <Link
          to="/manual"
          className="font-mono text-text-muted hover:text-text-silver"
          style={{ fontSize: '11px' }}
          data-size="meta"
        >
          Continue as anonymous Bee · read only →
        </Link>
      </div>
    </main>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded px-2 py-1.5 text-xs transition-colors',
        active ? 'bg-bg text-text' : 'text-text-muted hover:text-text-silver',
      )}
    >
      {children}
    </button>
  );
}

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}

function Field({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  autoComplete,
  required,
  minLength,
}: FieldProps) {
  return (
    <label className="block">
      <span
        className="mb-1 block font-mono text-text-silver"
        style={{ fontSize: '11px' }}
        data-size="meta"
      >
        {label}
      </span>
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          className={cn(
            'w-full rounded-md border border-border bg-bg py-2 pr-3 text-sm text-text',
            'placeholder:text-text-muted',
            'focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30',
            icon ? 'pl-8' : 'pl-3',
          )}
        />
      </div>
      {hint && (
        <p className="mt-1 text-text-muted" style={{ fontSize: '11px' }}>
          {hint}
        </p>
      )}
    </label>
  );
}
