import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

type Role = "owner" | "staff" | "customer";

type AuthState = {
  session: Session | null;
  user: User | null;
  roles: Role[];
  /** True until the stored session (and roles) have been read. */
  loading: boolean;
  isStaff: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Roles are read for UI decisions only (showing admin links). Every protected
// read and write is enforced by RLS and has_role() in the database.
async function fetchRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) return [];
  return data.map((r) => r.role);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        setSession(data.session);
        setRoles(data.session ? await fetchRoles(data.session.user.id) : []);
      })
      .catch(() => undefined)
      .finally(() => active && setLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      // Defer the follow-up query so it never runs inside the auth callback.
      setTimeout(() => {
        if (!active) return;
        if (next) fetchRoles(next.user.id).then((r) => active && setRoles(r));
        else setRoles([]);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setRoles([]);
  }, []);

  const refreshRoles = useCallback(async () => {
    if (session) setRoles(await fetchRoles(session.user.id));
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      roles,
      loading,
      isStaff: roles.includes("owner") || roles.includes("staff"),
      isOwner: roles.includes("owner"),
      signOut,
      refreshRoles,
    }),
    [session, roles, loading, signOut, refreshRoles],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Resolves the current user's staff/owner status straight from the database. */
export async function checkAccess(): Promise<{
  userId: string | null;
  isStaff: boolean;
  isOwner: boolean;
}> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id ?? null;
  if (!userId) return { userId: null, isStaff: false, isOwner: false };
  const [staff, owner] = await Promise.all([
    supabase.rpc("is_staff", { _user_id: userId }),
    supabase.rpc("has_role", { _user_id: userId, _role: "owner" }),
  ]);
  return { userId, isStaff: staff.data === true, isOwner: owner.data === true };
}
