import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Consultor from "./pages/Consultor.tsx";
import PublicSolution from "./pages/PublicSolution.tsx";
import AceiteProposta from "./pages/AceiteProposta.tsx";
import Auth from "./pages/Auth.tsx";
import { RequireAuth } from "@/components/RequireAuth";
import { ClienteLayout } from "@/components/cliente/ClienteLayout";
import ClienteHome from "./pages/cliente/ClienteHome.tsx";
import Perfil from "./pages/cliente/Perfil.tsx";
import ClientePlaceholder from "./pages/cliente/ClientePlaceholder.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/consultor" element={<RequireAuth role="consultor"><Consultor /></RequireAuth>} />
          <Route path="/solucao/:id" element={<PublicSolution />} />
          <Route path="/solucao/:id/aceite" element={<AceiteProposta />} />

          <Route path="/cliente/contratos/:id" element={<RequireAuth role="cliente"><ClienteLayout /></RequireAuth>}></Route>

          <Route path="/cliente" element={<RequireAuth role="cliente"><ClienteLayout /></RequireAuth>}>
            <Route index element={<ClienteHome />} />
            <Route path="contratos" element={<ClientePlaceholder title="Contratos" description="Seus contratos ativos e histórico." />} />
            <Route path="faturas" element={<ClientePlaceholder title="Faturas" description="Faturas em aberto, pagas e vencidas." />} />
            <Route path="servicos" element={<ClientePlaceholder title="Serviços" description="Serviços a la carte disponíveis para contratação." />} />
            <Route path="plano" element={<ClientePlaceholder title="Plano" description="Seu plano atual e opções de troca." />} />
            <Route path="projetos" element={<ClientePlaceholder title="Projetos" description="Acompanhamento dos projetos contratados." />} />
            <Route path="perfil" element={<Perfil />} />
          </Route>

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
