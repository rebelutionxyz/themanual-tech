import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, ShoppingBag, X } from 'lucide-react';
import { bazaarCreateListing } from '@/lib/bazaar';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { BAZAAR_ACCENT } from '@/components/bazaar/cards';
import { useCategoryGroups } from '@/components/bazaar/useCategoryGroups';

const CONDITIONS: { value: string; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'service', label: 'Service' },
  { value: 'digital', label: 'Digital' },
];

const INPUT_CLASS =
  'w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-900 outline-none transition-colors focus:border-zinc-400';

export function BazaarNew() {
  const navigate = useNavigate();
  const { bee } = useAuth();
  const categoryGroups = useCategoryGroups();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [priceBling, setPriceBling] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [imageInputs, setImageInputs] = useState<string[]>(['']);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    // Client validation mirrors the server CHECKs.
    const t = title.trim();
    if (t.length < 2 || t.length > 200) return setError('Title must be 2–200 characters.');
    if (!category) return setError('Choose a category.');
    if (!condition) return setError('Choose a condition.');
    const price = Number(priceBling);
    if (!Number.isFinite(price) || price < 0.1) {
      return setError('Price must be at least 0.1 BLiNG!.');
    }
    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      return setError('Quantity must be a whole number of 1 or more.');
    }
    const imageUrls = imageInputs.map((s) => s.trim()).filter(Boolean);

    setSubmitting(true);
    try {
      const id = await bazaarCreateListing({
        title: t,
        description: description.trim() || null,
        category,
        condition,
        priceBling: price,
        quantity: qty,
        imageUrls,
      });
      navigate(`/bazaar/${id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the offer.');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-7 md:px-8">
      <Link
        to="/bazaar"
        className="inline-flex items-center gap-1.5 font-mono text-zinc-500 hover:text-zinc-700"
        style={{ fontSize: '12px' }}
      >
        <ArrowLeft size={14} /> Back to Bazaar
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <div
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-2"
          style={{ borderColor: `${BAZAAR_ACCENT}40`, background: `${BAZAAR_ACCENT}0D` }}
        >
          <ShoppingBag size={22} style={{ color: BAZAAR_ACCENT }} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-wide" style={{ color: BAZAAR_ACCENT }}>
            Make an Offer
          </h1>
          <p className="font-mono text-zinc-500" style={{ fontSize: '12px' }}>
            OFFER goods &amp; services · GET with BLiNG!
          </p>
        </div>
      </div>

      {!bee && (
        <p className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600" style={{ fontSize: '13px' }}>
          You’ll need to{' '}
          <Link to="/login" className="font-semibold" style={{ color: BAZAAR_ACCENT }}>
            sign in
          </Link>{' '}
          to post an Offer.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Title" required>
          <input
            className={INPUT_CLASS}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="What are you offering?"
          />
        </Field>

        <Field label="Category" required>
          <select
            className={INPUT_CLASS}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          >
            <option value="">Choose a category…</option>
            {categoryGroups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Condition" required>
            <select
              className={INPUT_CLASS}
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              aria-label="Condition"
            >
              <option value="">Choose…</option>
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Price (BLiNG!)" required>
            <input
              className={INPUT_CLASS}
              type="number"
              min={0.1}
              step={0.1}
              value={priceBling}
              onChange={(e) => setPriceBling(e.target.value)}
              placeholder="0.1"
            />
          </Field>

          <Field label="Quantity">
            <input
              className={INPUT_CLASS}
              type="number"
              min={1}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Description">
          <textarea
            className={cn(INPUT_CLASS, 'min-h-[96px] resize-y')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, specifics, terms…"
          />
        </Field>

        <Field label="Images" hint="Paste image URLs (optional).">
          <div className="space-y-2">
            {imageInputs.map((url, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are positional inputs with no stable id
              <div key={i} className="flex items-center gap-2">
                <input
                  className={INPUT_CLASS}
                  value={url}
                  onChange={(e) =>
                    setImageInputs((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))
                  }
                  placeholder="https://…"
                />
                {imageInputs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setImageInputs((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Remove image"
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setImageInputs((prev) => [...prev, ''])}
              className="inline-flex items-center gap-1 font-medium text-zinc-600 transition-colors hover:text-zinc-900"
              style={{ fontSize: '12px' }}
            >
              <Plus size={13} /> Add image
            </button>
          </div>
        </Field>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-red-600" style={{ fontSize: '13px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !bee}
          className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: BAZAAR_ACCENT, fontSize: '14px' }}
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Post Offer
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: the form control is passed in via {children}
    <label className="block">
      <span className="mb-1 block font-medium text-zinc-700" style={{ fontSize: '13px' }}>
        {label}
        {required && <span style={{ color: BAZAAR_ACCENT }}> *</span>}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-zinc-400" style={{ fontSize: '11px' }}>
          {hint}
        </span>
      )}
    </label>
  );
}
