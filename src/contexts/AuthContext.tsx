import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { authRedirectUrl, supabase } from "@/lib/supabase";
import type { Profile } from "@/types/database";

type AuthResult = { error: string | null };

type SignUpParams = {
  email: string;
  password: string;
  fullName: string;
};

type SignUpResult = AuthResult & { needsEmailConfirmation: boolean };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** true enquanto a sessão inicial é restaurada do storage. */
  loading: boolean;
  /** true enquanto o perfil da família é carregado. */
  profileLoading: boolean;
  /** true quando o usuário chegou por um link de recuperação de senha. */
  recoveryMode: boolean;
  clearRecoveryMode: () => void;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (params: SignUpParams) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const errorMessages: { match: string; message: string }[] = [
  { match: "invalid login credentials", message: "E-mail ou senha incorretos." },
  { match: "email not confirmed", message: "Confirme seu e-mail antes de entrar." },
  { match: "user already registered", message: "Este e-mail já está cadastrado." },
  { match: "password should be at least", message: "A senha precisa ter pelo menos 6 caracteres." },
  { match: "unable to validate email", message: "Informe um e-mail válido." },
  { match: "email rate limit", message: "Muitas tentativas. Aguarde alguns minutos." },
  { match: "for security purposes", message: "Aguarde alguns segundos antes de tentar novamente." },
];

function translateAuthError(message: string) {
  const normalized = message.toLowerCase();
  const known = errorMessages.find((entry) => normalized.includes(entry.match));
  return known?.message ?? "Não foi possível concluir a ação. Tente novamente.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
    if (!error && data) {
      setProfile(data as Profile);
    } else if (error) {
      setProfile(null);
    }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    void loadProfile(userId);
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const signUp = useCallback(async ({ email, password, fullName }: SignUpParams): Promise<SignUpResult> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: authRedirectUrl("/login"),
        data: { full_name: fullName.trim() },
      },
    });

    if (error) {
      return { error: translateAuthError(error.message), needsEmailConfirmation: false };
    }

    return { error: null, needsEmailConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const requestPasswordReset = useCallback(async (email: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: authRedirectUrl("/recuperar-senha"),
    });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const updatePassword = useCallback(async (password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? translateAuthError(error.message) : null };
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentId = userId;
    if (!currentId) return;
    await loadProfile(currentId);
  }, [loadProfile, userId]);

  const clearRecoveryMode = useCallback(() => setRecoveryMode(false), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileLoading,
      recoveryMode,
      clearRecoveryMode,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      profileLoading,
      recoveryMode,
      clearRecoveryMode,
      signIn,
      signUp,
      signOut,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider");
  }
  return context;
}
