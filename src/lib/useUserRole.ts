import { useEffect, useState } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';
import type { UserRole } from '@/admin/types';

// Schema note: nova_registry and astra_registry are net new per Lock 9.6
// (federation-tier-1-scoping.md) and have NOT been applied to production.
// Queries below fail-soft when those tables (or a created_by column) are
// absent — isPropertyOwner falls to false until the migration ships.

const EMPTY_ROLE: UserRole = {
  bee: null,
  isAuthenticated: false,
  isPropertyOwner: false,
  isKeyholder: false,
};

async function countOwnedProperties(table: string, beeId: string): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from(table)
    .select('id', { head: true, count: 'exact' })
    .eq('created_by', beeId);
  if (error) return 0;
  return count ?? 0;
}

async function fetchKeyholderFlag(beeId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data, error } = await supabase.functions.invoke<{ is_keyholder: boolean }>(
      'check-keyholder',
      { body: { bee_id: beeId } },
    );
    if (error) return false;
    return Boolean(data?.is_keyholder);
  } catch {
    return false;
  }
}

export function useUserRole(): { role: UserRole; loading: boolean } {
  const { bee, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(EMPTY_ROLE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function compute() {
      if (authLoading) return;

      if (!bee) {
        if (!cancelled) {
          setRole(EMPTY_ROLE);
          setLoading(false);
        }
        return;
      }

      const [novaCount, astraCount, isKeyholder] = await Promise.all([
        countOwnedProperties('nova_registry', bee.id),
        countOwnedProperties('astra_registry', bee.id),
        fetchKeyholderFlag(bee.id),
      ]);

      if (cancelled) return;
      setRole({
        bee: { id: bee.id, handle: bee.handle },
        isAuthenticated: true,
        isPropertyOwner: novaCount + astraCount > 0,
        isKeyholder,
      });
      setLoading(false);
    }

    void compute();
    return () => {
      cancelled = true;
    };
  }, [bee, authLoading]);

  return { role, loading: loading || authLoading };
}
