import { useState } from "react";
import type { ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Lock, LogOut, MoreHorizontal, Users } from "lucide-react";

import { Logo } from "@/components/Logo";
import { NotificationCenter } from "@/components/NotificationCenter";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { InitialsAvatar } from "@/components/InitialsAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useFamily } from "@/contexts/FamilyContext";
import { areBabyModulesUnlocked } from "@/lib/baby";
import { roleLabels } from "@/lib/family";
import { familyNav, mainNav, mobileMoreNav, mobileNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
    isActive
      ? "bg-primary text-primary-foreground shadow-soft"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  );
}

function mobileItemClass(isActive: boolean) {
  return cn(
    "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[20px] px-0.5 py-2 text-[10px] font-semibold transition-all",
    isActive
      ? "bg-primary text-primary-foreground shadow-soft"
      : "text-muted-foreground hover:bg-muted",
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { profile, user, signOut } = useAuth();
  const { family, membership, babyProfile, activeMembersCount, pendingInvitationsCount } =
    useFamily();

  // Rotina, Vacinas e Crescimento só são liberados com a data de nascimento.
  const babyUnlocked = areBabyModulesUnlocked(babyProfile, family);

  const displayName =
    profile?.full_name?.trim() || user?.email?.split("@")[0] || "Sua conta";
  const roleLabel = membership ? roleLabels[membership.role] : "Sem família";
  const familyName = family?.name ?? "Criar família";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navegação lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-border/70 bg-card/80 px-4 py-6 backdrop-blur lg:flex">
        <div className="flex items-center justify-between gap-2 px-2">
          <Link to="/">
            <Logo />
          </Link>
          <NotificationCenter className="bg-background text-foreground/70 hover:bg-muted hover:text-foreground" />
        </div>

        <Link
          to="/familia/configuracoes"
          className="mt-6 flex items-center gap-3 rounded-3xl border border-border/70 bg-secondary/50 p-3 transition-colors hover:bg-secondary"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-card text-primary shadow-soft">
            <Users className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-sm font-semibold text-secondary-foreground">
              {familyName}
            </span>
            <span className="block text-xs text-secondary-foreground/70">
              {activeMembersCount} {activeMembersCount === 1 ? "membro" : "membros"} ·{" "}
              {pendingInvitationsCount}{" "}
              {pendingInvitationsCount === 1 ? "convite" : "convites"}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 text-secondary-foreground/60" />
        </Link>

        <nav className="mt-6 flex-1 space-y-6 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Principal
            </p>
            {mainNav.map((item) => {
              const locked = Boolean(item.requiresBabyBirthDate) && !babyUnlocked;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(navLinkClass({ isActive }), locked && "opacity-60")
                  }
                >
                  <item.icon className="h-[18px] w-[18px]" />
                  {item.label}
                  {locked && (
                    <Lock className="ml-auto h-3.5 w-3.5" aria-label="Bloqueado" />
                  )}
                </NavLink>
              );
            })}
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Família
            </p>
            {familyNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="mt-4 rounded-3xl border border-border/70 bg-cream p-3">
          <div className="flex items-center gap-3">
            <InitialsAvatar name={displayName} tone="lavender" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sair da conta"
              className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Cabeçalho mobile */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <Logo markClassName="h-10 w-10" />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationCenter className="bg-card text-foreground/70 shadow-soft hover:text-foreground" />
            <Link to="/familia/configuracoes" aria-label="Abrir perfil">
              <InitialsAvatar name={displayName} tone="lavender" />
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:pl-72">
        <main className="mx-auto w-full max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>

      {/* Barra inferior mobile */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-3 mb-3 flex items-stretch gap-0.5 rounded-[26px] border border-border/80 bg-card/95 p-1.5 shadow-float backdrop-blur">
          {mobileNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => mobileItemClass(isActive)}
            >
              <item.icon className="h-[19px] w-[19px]" />
              <span className="truncate">{item.shortLabel ?? item.label}</span>
            </NavLink>
          ))}

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={mobileItemClass(
                  moreOpen || mobileMoreNav.some((item) => item.to === pathname),
                )}
                aria-label="Mais opções"
              >
                <MoreHorizontal className="h-[19px] w-[19px]" />
                <span className="truncate">Mais</span>
              </button>
            </SheetTrigger>

            <SheetContent side="bottom" className="rounded-t-[28px] pb-8">
              <SheetHeader className="text-left">
                <SheetTitle className="font-display text-base">Mais do Nosso Bebê</SheetTitle>
              </SheetHeader>

              <nav className="mt-3 grid max-h-[68vh] gap-1.5 overflow-y-auto pr-1">
                {mobileMoreNav.map((item) => {
                  const locked = Boolean(item.requiresBabyBirthDate) && !babyUnlocked;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMoreOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-soft"
                            : "text-foreground/80 hover:bg-muted",
                          locked && !isActive && "opacity-70",
                        )
                      }
                    >
                      <item.icon className="h-[18px] w-[18px]" />
                      {item.label}
                      {locked && (
                        <Lock className="ml-auto h-3.5 w-3.5" aria-label="Bloqueado" />
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
