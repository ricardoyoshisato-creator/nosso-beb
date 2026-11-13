import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/AppShell";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthProvider } from "@/contexts/AuthContext";
import { FamilyProvider } from "@/contexts/FamilyContext";
import Index from "./pages/Index";
import BabyProfile from "./pages/BabyProfile";
import Routine from "./pages/Routine";
import Vaccines from "./pages/Vaccines";
import Growth from "./pages/Growth";
import Pregnancy from "./pages/Pregnancy";
import Appointments from "./pages/Appointments";
import Exams from "./pages/Exams";
import Medications from "./pages/Medications";
import Layette from "./pages/Layette";
import Gifts from "./pages/Gifts";
import Inventory from "./pages/Inventory";
import Documents from "./pages/Documents";
import Memories from "./pages/Memories";
import Reports from "./pages/Reports";
import Expenses from "./pages/Expenses";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import FamilySettings from "./pages/FamilySettings";
import Members from "./pages/Members";
import Invites from "./pages/Invites";
import Permissions from "./pages/Permissions";
import AcceptInvite from "./pages/AcceptInvite";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => (
  <AppShell>
    <Outlet />
  </AppShell>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <FamilyProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/recuperar-senha" element={<ForgotPassword />} />
              <Route path="/convite/:token" element={<AcceptInvite />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Index />} />
                <Route path="/bebe/perfil" element={<BabyProfile />} />
                <Route path="/rotina" element={<Routine />} />
                <Route path="/vacinas" element={<Vaccines />} />
                <Route path="/crescimento" element={<Growth />} />
                <Route path="/gestacao" element={<Pregnancy />} />
                <Route path="/consultas" element={<Appointments />} />
                <Route path="/exames" element={<Exams />} />
                <Route path="/medicamentos" element={<Medications />} />
                <Route path="/enxoval" element={<Layette />} />
                <Route path="/presentes" element={<Gifts />} />
                <Route path="/estoque" element={<Inventory />} />
                <Route path="/documentos" element={<Documents />} />
                <Route path="/memorias" element={<Memories />} />
                <Route path="/relatorios" element={<Reports />} />
                <Route path="/financeiro" element={<Expenses />} />
                <Route path="/familia/configuracoes" element={<FamilySettings />} />
                <Route path="/familia/membros" element={<Members />} />
                <Route path="/familia/convites" element={<Invites />} />
                <Route path="/familia/permissoes" element={<Permissions />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </FamilyProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
