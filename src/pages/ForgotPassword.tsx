import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2, Lock, Mail, MailCheck, Send } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { requestPasswordReset, updatePassword, recoveryMode, clearRecoveryMode } = useAuth();

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (recoveryMode) {
      setSent(false);
      setFormError(null);
    }
  }, [recoveryMode]);

  const handleRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSubmitting(true);

    const { error } = await requestPasswordReset(email);
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    setSent(true);
  };

  const handleUpdate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (password.length < 6) {
      setFormError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setFormError("As senhas não conferem.");
      return;
    }

    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    clearRecoveryMode();
    toast({
      title: "Senha atualizada",
      description: "Use a nova senha nas próximas entradas.",
    });
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute -left-24 top-10 h-56 w-56 rounded-full bg-lavender/40" />
      <div className="pointer-events-none absolute -right-16 bottom-8 h-48 w-48 rounded-full bg-mint/40" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-xl flex-col px-5 py-7 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/login" aria-label="Voltar para o login">
            <Logo />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-semibold text-muted-foreground shadow-soft transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar
          </Link>
        </div>

        <div className="flex flex-1 items-center py-8">
          <div className="w-full animate-rise rounded-4xl border border-border/70 bg-card p-6 shadow-float sm:p-8">
            {recoveryMode ? (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Lock className="h-6 w-6" />
                </span>
                <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight text-foreground">
                  Defina uma nova senha
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Escolha uma senha nova para proteger os registros da sua família.
                </p>

                <form onSubmit={handleUpdate} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="new-password" className="text-xs font-semibold text-foreground/80">
                      Nova senha
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="h-12 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-semibold text-foreground/80">
                      Confirme a nova senha
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      minLength={6}
                      autoComplete="new-password"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder="Repita a senha"
                      className="h-12 rounded-2xl border-border bg-background text-sm focus-visible:ring-primary/40"
                    />
                  </div>

                  {formError && (
                    <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium leading-relaxed text-destructive">
                      {formError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-2xl text-sm font-semibold shadow-soft"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    Salvar nova senha
                  </Button>
                </form>
              </>
            ) : !sent ? (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
                  <KeyRound className="h-6 w-6" />
                </span>
                <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight text-foreground">
                  Recuperar senha
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Informe o e-mail cadastrado na sua conta. Enviaremos um link para você criar uma
                  nova senha com segurança.
                </p>

                <form onSubmit={handleRequest} className="mt-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
                      E-mail da conta
                    </Label>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="voce@email.com"
                        className="h-12 rounded-2xl border-border bg-background pl-11 text-sm focus-visible:ring-primary/40"
                      />
                    </div>
                  </div>

                  {formError && (
                    <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium leading-relaxed text-destructive">
                      {formError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-12 w-full rounded-2xl text-sm font-semibold shadow-soft transition-transform hover:-translate-y-0.5"
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Enviar link de recuperação
                  </Button>
                </form>

                <div className="mt-5 rounded-2xl bg-cream p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    O link expira em 30 minutos. Se não encontrar o e-mail, confira a caixa de spam
                    ou fale com o administrador da família.
                  </p>
                </div>
              </>
            ) : (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
                  <MailCheck className="h-6 w-6" />
                </span>
                <h1 className="mt-5 font-display text-[28px] font-semibold leading-tight text-foreground">
                  Link enviado!
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Se existir uma conta para{" "}
                  <span className="font-semibold text-foreground">{email}</span>, o link de
                  recuperação está a caminho. Abra o e-mail para definir a nova senha.
                </p>

                <Button asChild className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold shadow-soft">
                  <Link to="/login">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar para o login
                  </Link>
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setFormError(null);
                  }}
                  className="mt-4 w-full text-center text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Usar outro e-mail
                </button>
              </>
            )}
          </div>
        </div>

        <p className="pb-2 text-center text-[11px] leading-relaxed text-muted-foreground/80">
          Nosso Bebê · cuidado e privacidade para a sua família
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
