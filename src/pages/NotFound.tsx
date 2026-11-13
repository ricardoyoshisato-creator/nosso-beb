import { Link } from "react-router-dom";
import { Home } from "lucide-react";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-12">
      <div className="pointer-events-none absolute -left-20 top-10 h-56 w-56 rounded-full bg-lavender/40" />
      <div className="pointer-events-none absolute -right-16 bottom-6 h-48 w-48 rounded-full bg-mint/40" />

      <div className="relative w-full max-w-md rounded-4xl border border-border/70 bg-card p-7 text-center shadow-float">
        <div className="flex justify-center">
          <Logo />
        </div>
        <p className="mt-6 font-display text-5xl font-semibold text-primary">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-foreground">
          Esta página não existe
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Talvez o link tenha mudado de lugar. Vamos voltar para o cantinho da família?
        </p>
        <Button asChild className="mt-6 h-11 w-full rounded-2xl text-sm font-semibold shadow-soft">
          <Link to="/">
            <Home className="h-4 w-4" />
            Voltar ao início
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
