import {
  Baby,
  BarChart3,
  Boxes,
  CalendarHeart,
  Clock,
  FlaskConical,
  FolderOpen,
  Gift,
  HeartPulse,
  Home,
  MailPlus,
  Pill,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Stethoscope,
  Syringe,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  end?: boolean;
  /** Módulo do bebê: só libera depois que a data de nascimento é cadastrada. */
  requiresBabyBirthDate?: boolean;
};

export const mainNav: NavItem[] = [
  { to: "/", label: "Início", icon: Home, end: true },
  { to: "/bebe/perfil", label: "Perfil do Bebê", shortLabel: "Bebê", icon: Baby },
  { to: "/gestacao", label: "Gestação", icon: HeartPulse },
  { to: "/rotina", label: "Rotina", icon: Clock, requiresBabyBirthDate: true },
  { to: "/vacinas", label: "Vacinas", icon: Syringe, requiresBabyBirthDate: true },
  { to: "/crescimento", label: "Crescimento", icon: TrendingUp, requiresBabyBirthDate: true },
  { to: "/enxoval", label: "Enxoval", icon: ShoppingBag },
  { to: "/presentes", label: "Presentes", icon: Gift },
  { to: "/estoque", label: "Estoque", icon: Boxes },
  { to: "/documentos", label: "Documentos", icon: FolderOpen },
  { to: "/memorias", label: "Memórias", icon: CalendarHeart },
  { to: "/medicamentos", label: "Medicamentos", shortLabel: "Remédios", icon: Pill },
  { to: "/consultas", label: "Consultas", icon: Stethoscope },
  { to: "/exames", label: "Exames", icon: FlaskConical },
  { to: "/financeiro", label: "Financeiro", shortLabel: "Gastos", icon: Wallet },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export const familyNav: NavItem[] = [
  { to: "/familia/membros", label: "Membros", icon: Users },
  { to: "/familia/convites", label: "Convites", icon: MailPlus },
  { to: "/familia/permissoes", label: "Permissões", icon: ShieldCheck },
  { to: "/familia/configuracoes", label: "Configurações da família", shortLabel: "Família", icon: Settings2 },
];

export const allNav: NavItem[] = [...mainNav, ...familyNav];

function navByHref(...hrefs: string[]) {
  return hrefs
    .map((href) => allNav.find((item) => item.to === href))
    .filter((item): item is NavItem => Boolean(item));
}

/** Barra inferior mobile: os destinos usados no dia a dia. */
export const mobileNav: NavItem[] = navByHref(
  "/",
  "/gestacao",
  "/medicamentos",
  "/consultas",
  "/financeiro",
);

/** Destinos extras do menu "Mais" (bebê, rotina, vacinas, enxoval, exames e família). */
export const mobileMoreNav: NavItem[] = [
  ...navByHref("/bebe/perfil", "/rotina", "/vacinas", "/crescimento", "/enxoval", "/presentes", "/estoque", "/documentos", "/memorias", "/exames", "/relatorios"),
  ...familyNav,
];
