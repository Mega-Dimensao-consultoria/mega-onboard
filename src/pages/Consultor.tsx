import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useBrand } from "@/hooks/useBrand";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPanel } from "@/components/consultor/DashboardPanel";
import { LeadsPanel } from "@/components/consultor/LeadsPanel";
import { QuestionsEditor } from "@/components/consultor/QuestionsEditor";
import { BrandingPanel } from "@/components/consultor/BrandingPanel";
import { ContentPanel } from "@/components/consultor/ContentPanel";
import { CatalogPanel } from "@/components/consultor/CatalogPanel";
import { ClientsPanel } from "@/components/consultor/ClientsPanel";
import { ContractsPanel } from "@/components/consultor/ContractsPanel";
import { ConsultorInvoicesPanel } from "@/components/consultor/ConsultorInvoicesPanel";
import { PlanChangeRequestsPanel } from "@/components/consultor/PlanChangeRequestsPanel";
import { AuditLogPanel } from "@/components/consultor/AuditLogPanel";
import { HomeSectionsPanel } from "@/components/consultor/HomeSectionsPanel";
import { LogOut } from "lucide-react";

export default function Consultor() {
  const navigate = useNavigate();
  const { brand, refresh } = useBrand();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <BrandHeader rightSlot={
        <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate("/auth"); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      } />

      <main className="flex-1 container py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Painel</div>
          <h1 className="font-display text-4xl">Consultor</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie leads, clientes, contratos, faturas e a marca da {brand?.nome_fantasia || "consultoria"}.
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="w-full">
          {/* Container scrollável para mobile */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
            <TabsList className="inline-flex sm:flex sm:flex-wrap h-auto whitespace-nowrap">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
              <TabsTrigger value="clients">Clientes</TabsTrigger>
              <TabsTrigger value="contracts">Contratos</TabsTrigger>
              <TabsTrigger value="invoices">Faturas</TabsTrigger>
              <TabsTrigger value="plan-changes">Trocas de plano</TabsTrigger>
              <TabsTrigger value="catalog">Catálogo</TabsTrigger>
              <TabsTrigger value="editor">Formulário</TabsTrigger>
              <TabsTrigger value="content">Conteúdo</TabsTrigger>
              <TabsTrigger value="brand">Marca</TabsTrigger>
              <TabsTrigger value="home-blocks">Blocos da Home</TabsTrigger>
              <TabsTrigger value="audit">Auditoria</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="mt-6"><DashboardPanel /></TabsContent>
          <TabsContent value="leads" className="mt-6"><LeadsPanel brand={brand} /></TabsContent>
          <TabsContent value="clients" className="mt-6"><ClientsPanel /></TabsContent>
          <TabsContent value="contracts" className="mt-6"><ContractsPanel /></TabsContent>
          <TabsContent value="invoices" className="mt-6"><ConsultorInvoicesPanel /></TabsContent>
          <TabsContent value="plan-changes" className="mt-6"><PlanChangeRequestsPanel /></TabsContent>
          <TabsContent value="catalog" className="mt-6"><CatalogPanel /></TabsContent>
          <TabsContent value="editor" className="mt-6"><QuestionsEditor /></TabsContent>
          <TabsContent value="content" className="mt-6"><ContentPanel brand={brand} onSaved={refresh} /></TabsContent>
          <TabsContent value="brand" className="mt-6"><BrandingPanel brand={brand} onSaved={refresh} /></TabsContent>
          <TabsContent value="home-blocks" className="mt-6"><HomeSectionsPanel /></TabsContent>
          <TabsContent value="audit" className="mt-6"><AuditLogPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
