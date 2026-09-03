import { ManualLogo } from '@/components/ui/ManualLogo';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { AtSign, Lock } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sign-in ONLY (landing gate 2026-07-10): no sign-up, no magic link, no
 * anonymous-browsing link. The platform is pre-open — accounts are created
 * out-of-band (Supabase dashboard) until launch.
 *
 * FRONT32: one field takes a USERNAME or an email. The form does not decide
 * which -- it hands the raw string to `signIn`, which routes it through the
 * auth-login edge function where a username is resolved to an address
 * server-side. Note the input is deliberately `type="text"`, not
 * `type="email"`: browser email validation would reject every username before
 * the form ever submitted.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, configured, bee } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (bee) {
    // Already signed in → the front-door gate routes by allowlist/role.
    navigate('/');
    return null;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await signIn(identifier, password);
      if (error) setError(error.message);
      else navigate('/');
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
          Welcome back
        </h1>
      </div>

      {!configured && (
        <div className="mb-6 rounded-md border border-kettle-contested/30 bg-kettle-contested/10 p-3">
          <p className="text-kettle-contested" style={{ fontSize: '12px' }}>
            Supabase not yet configured. Set <code className="font-mono">VITE_SUPABASE_URL</code>{' '}
            and <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          label="Username or email"
          icon={<AtSign size={14} />}
          type="text"
          value={identifier}
          onChange={setIdentifier}
          placeholder="yourname or you@domain"
          autoComplete="username"
          required
        />

        <Field
          label="Password"
          icon={<Lock size={14} />}
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

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
          {loading ? '...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

interface FieldProps {
  label: string;
  icon?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

function Field({
  label,
  icon,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
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
          // FRONT32: a mobile keyboard that auto-capitalizes or autocorrects
          // turns "butch" into "Butch" before it is ever submitted. The edge
          // function lowercases, so case is survivable -- autocorrect rewriting
          // the word is not.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required={required}
          className={cn(
            'w-full rounded-md border border-border bg-bg py-2 pr-3 text-sm text-text',
            'placeholder:text-text-muted',
            'focus:border-text-silver/50 focus:outline-none focus:ring-1 focus:ring-text-silver/30',
            icon ? 'pl-8' : 'pl-3',
          )}
        />
      </div>
    </label>
  );
}
