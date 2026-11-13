import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2, MailWarning, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { roleLabels } from "@/lib/family";
import type { FamilyInvitation } from "@/types/database";

type Screen = "loading" | "signin" | "ready" | "error" | "done";

const AcceptInvite = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { refresh } = useFamily();

  const [screen, setScreen] = useState<Screen>("loading");
  const [message, setMessage] = useState("");
  const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setScreen("signin");
      return;
    }

    if (!token) {
      setScreen("error");
      setMessage("Este link de convite está incompleto.");
      return;
    }

    let active = true;

    const fetchInvitation = async () => {
      setScreen("loading");
      const { data, error } = await supabase
        .from("family_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setScreen("error");
        setMessage("Não foi possível verificar este convite. Tente novamente.");
        return;
      }

      const invite = data as FamilyInvitation | null;

      if (!invite) {
        setScreen("error");
        setMessage("Convite não encontrado ou já utilizado.");
        return;
      }

      const isForThisUser =
        (user.email ?? "").toLowerCase() === invite.email.toLowerCase();

      if (!isForThisUser) {
        setScreen("error");
        setMessage(`Este convite foi enviado para ${invite.email}. Entre com esse e-mail para aceitar.`);
        return;
      }

      if (invite.status === "accepted") {
        setScreen("done");
        return;
      }

      if (invite.status !== "pending") {
        setScreen("error");
        setMessage("Este convite foi cancelado. Peça um novo link para a família.");
        return;
      }

      if (new Date(invite.expires_at).getTime() <= Date.now()) {
        setScreen("error");
        setMessage("Este convite expirou. Peça para alguém da família renovar o link.");
        return;
      }

      setInvitation(invite);
      setScreen("ready");
    };

    void fetchInvitation();

    return () => {
      active = false;
    };
  }, [authLoading, token, user]);

  const handleAccept = async () => {
    if (!invitation || !user) return;

    setAccepting(true);

    const { error: memberError } = await supabase.from("family_members").insert({
      family_id: invitation.family_id,
      user_id: user.id,
      role: invitation.role,
      status: "active",
      invited_by: invitation.invited_by,
      joined_at: new Date().toISOString(),
    });

    if (memberError && memberError.code !== "23505") {
      setAccepting(false);
      setScreen("error");
      setMessage("Não foi possível entrar na família agora. Tente novamente.");
      return;
    }

    await supabase
      .from("family_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
        accepted_by: user.id,
      })
      .eq("id", invitation.id);

    await refresh();
    setAccepting(false);
    setScreen("done");
    toast({ title: "Bem-vindo à família!", description: "Seu acesso já está ativo." });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10">
      <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-lavender/40" />
      <div className="pointer-events-none absolute -right-16 bottom-6 h-48 w-48 rounded-full bg-mint/40" />

      <div className="relative w-full max-w-md rounded-4xl border border-border/70 bg-card p-7 shadow-float">
        <div className="flex justify-center">
          <Logo />
        </div>

        {screen === "loading" && (
          <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm font-medium">Verificando seu convite…</p>
          </div>
        )}

        {screen === "signin" && (
          <>
            <span className="mx-auto mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-center font-display text-2xl font-semibold text-foreground">
              Entre para aceitar o convite
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Use o e-mail que recebeu o convite. Se ainda não tem conta, crie uma com esse mesmo
              endereço.
            </p>
            <Button asChild className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold shadow-soft">
              <Link to="/login" state={{ from: `/convite/${token ?? ""}` }}>
                Entrar ou criar conta
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}

        {screen === "ready" && invitation && (
          <>
            <span className="mx-auto mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <MailWarning className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-center font-display text-2xl font-semibold text-foreground">
              Você foi convidado!
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Entre na família com o papel de{" "}
              <span className="font-semibold text-foreground">{roleLabels[invitation.role]}</span>.
              Você poderá sair quando quiser.
            </p>
            <Button
              onClick={handleAccept}
              disabled={accepting}
              className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold shadow-soft"
            >
              {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Aceitar convite
            </Button>
            <Button
              asChild
              variant="ghost"
              className="mt-2 h-11 w-full rounded-2xl text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              <Link to="/">Agora não</Link>
            </Button>
          </>
        )}

        {screen === "done" && (
          <>
            <span className="mx-auto mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-center font-display text-2xl font-semibold text-foreground">
              Tudo certo!
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">
              Seu acesso à família está ativo. Bom te ter por aqui.
            </p>
            <Button
              onClick={() => navigate("/", { replace: true })}
              className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold shadow-soft"
            >
              Ir para o início
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {screen === "error" && (
          <>
            <span className="mx-auto mt-7 grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <MailWarning className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-center font-display text-2xl font-semibold text-foreground">
              Convite indisponível
            </h1>
            <p className="mt-2 text-center text-sm leading-relaxed text-muted-foreground">{message}</p>
            <Button asChild className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold shadow-soft">
              <Link to="/">Voltar ao início</Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default AcceptInvite;
