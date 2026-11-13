import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail, MoveRight, UserRound } from "lucide-react";

import { Logo } from "@/components/Logo";
import { LoginArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading, signIn, signUp } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  useEffect(() => {
    if (!loading && session) {
      navigate(from, { replace: true });
    }
  }, [from, loading, navigate, session]);

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setFormError(null);
    setInfo(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setInfo(null);

    if (mode === "signup" && password.length < 6) {
      setFormError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSubmitting(true);

    if (mode === "signin") {
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) {
        setFormError(error);
        return;
      }
      navigate(from, { replace: true });
      return;
    }

    const { error, needsEmailConfirmation } = await signUp({ email, password, fullName });
    setSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    if (needsEmailConfirmation) {
      setInfo(
        `Enviamos um link de confirmação para ${email}. Confirme o e-mail para entrar na sua família.`,
      );
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-10 lg:py-12">
        {/* Painel ilustrado (desktop) */}
        <div className="order-2 hidden lg:order-1 lg:block">
          <div className="relative overflow-hidden rounded-4xl border border-border/70 bg-lavender/40 p-8">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sun/70" />
            <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-mint/70" />
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lavender-foreground/80">
                Nosso cantinho
              </p>
              <h2 className="mt-3 max-w-xs font-display text-[32px] font-semibold leading-[1.15] text-lavender-foreground">
                Cada descoberta do bebê, guardada em um só lugar.
              </h2>
              <LoginArt className="mx-auto mt-6 h-auto w-full max-w-[360px]" />
              <div className="mt-6 rounded-3xl bg-card/80 p-4 shadow-soft">
                <p className="text-sm leading-relaxed text-foreground/80">
                  Cada família tem seu próprio espaço privado. Só quem você convidar consegue ver os
                  registros, as fotos e a rotina do bebê.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Privacidade por padrão
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="order-1 w-full lg:order-2">
          <div className="mx-auto w-full max-w-md">
            <Logo />

            <div className="mt-7 animate-rise">
              <h1 className="text-balance font-display text-[30px] font-semibold leading-tight text-foreground sm:text-4xl">
                {mode === "signin" ? "Que bom ter você aqui" : "Crie a sua conta"}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {mode === "signin"
                  ? "Entre para acompanhar a gestação, os registros e a rotina da família."
                  : "Comece criando seu acesso. Depois você cria a família e convida quem quiser."}
              </p>
            </div>

            <div className="mt-6 lg:hidden">
              <LoginArt className="mx-auto h-auto w-full max-w-[240px]" />
            </div>

            <div className="mt-6 grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1">
              {(
                [
                  { id: "signin", label: "Entrar" },
                  { id: "signup", label: "Criar conta" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => changeMode(option.id)}
                  className={cn(
                    "rounded-xl py-2 text-xs font-semibold transition-all",
                    mode === option.id
                      ? "bg-card text-foreground shadow-soft"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="full-name" className="text-xs font-semibold text-foreground/80">
                    Seu nome
                  </Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="full-name"
                      required
                      autoComplete="name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Marina Almeida"
                      className="h-12 rounded-2xl border-border bg-card pl-11 text-sm shadow-soft placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground/80">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="voce@email.com"
                    className="h-12 rounded-2xl border-border bg-card pl-11 text-sm shadow-soft placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground/80">
                    Senha
                  </Label>
                  {mode === "signin" && (
                    <Link
                      to="/recuperar-senha"
                      className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      Esqueci minha senha
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={mode === "signin" ? "Sua senha" : "Mínimo de 6 caracteres"}
                    className="h-12 rounded-2xl border-border bg-card pl-11 pr-12 text-sm shadow-soft placeholder:text-muted-foreground/70 focus-visible:ring-primary/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {formError && (
                <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-xs font-medium leading-relaxed text-destructive">
                  {formError}
                </p>
              )}

              {info && (
                <p className="rounded-2xl bg-accent px-4 py-3 text-xs font-medium leading-relaxed text-accent-foreground">
                  {info}
                </p>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-2xl text-sm font-semibold shadow-soft transition-transform hover:-translate-y-0.5"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoveRight className="h-4 w-4" />
                )}
                {mode === "signin" ? "Entrar" : "Criar minha conta"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              Ao continuar você concorda em manter os dados da família em sigilo.
            </p>

            <p className="mt-3 text-center text-sm text-muted-foreground">
              {mode === "signin" ? "Ainda não tem uma conta?" : "Já tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => changeMode(mode === "signin" ? "signup" : "signin")}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {mode === "signin" ? "Criar conta" : "Entrar"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
