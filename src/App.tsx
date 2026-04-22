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
import Contratos from "./pages/cliente/Contratos.tsx";
import ContratoDetalhe from "./pages/cliente/ContratoDetalhe.tsx";
import Faturas from "./pages/cliente/Faturas.tsx";
import FaturaDetalhe from "./pages/cliente/FaturaDetalhe.tsx";
import Servicos from "./pages/cliente/Servicos.tsx";
import Plano from "./pages/cliente/Plano.tsx";
import Projetos from "./pages/cliente/Projetos.tsx";
import Unsubscribe from "./pages/Unsubscribe.tsx";

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
          <Route path="/unsubscribe" element={<Unsubscribe />} />


          <Route path="/cliente" element={<RequireAuth role="cliente"><ClienteLayout /></RequireAuth>}>
            <Route index element={<ClienteHome />} />
            <Route path="contratos" element={<Contratos />} />
            <Route path="contratos/:id" element={<ContratoDetalhe />} />
            <Route path="faturas" element={<Faturas />} />
            <Route path="faturas/:id" element={<FaturaDetalhe />} />
            <Route path="servicos" element={<Servicos />} />
            <Route path="plano" element={<Plano />} />
            <Route path="projetos" element={<Projetos />} />
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
