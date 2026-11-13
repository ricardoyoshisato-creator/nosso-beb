import { createClient } from "@supabase/supabase-js";

/**
 * Chaves públicas do projeto Supabase (a proteção real vem das políticas de RLS).
 * Variáveis de ambiente têm prioridade quando definidas no ambiente de deploy.
 */
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://jlvqpsdiymkpvaiiutvx.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_AlA7okkpcTn_-17XahE0mA_N0O2Eb66";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});

/** URL absoluta usada nos retornos de e-mail (confirmação, convite, recuperação). */
export const authRedirectUrl = (path = "/login") =>
  new URL(path, window.location.origin).href;
