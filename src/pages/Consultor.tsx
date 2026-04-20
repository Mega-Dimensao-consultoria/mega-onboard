import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { consultor } from "@/lib/api";
import { useBrand } from "@/hooks/useBrand";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadsPanel } from "@/components/consultor/LeadsPanel";
import { QuestionsEditor } from "@/components/consultor/QuestionsEditor";
import { BrandingPanel } from "@/components/consultor/BrandingPanel";
import { LogOut } from "lucide-react";

export default function Consultor() {
  const navigate = useNavigate();
  const { brand, refresh } = useBrand();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    consultor.verify().then((ok) => {
      if (!ok) navigate("/consultor/login");
      setChecking(false);
    });
  }, [navigate]);

  if (checking) return null;

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <BrandHeader rightSlot={
        <Button variant="ghost" size="sm" onClick={() => { consultor.clear(); navigate("/consultor/login"); }}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
      } />

      <main className="flex-1 container py-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Painel</div>
          <h1 className="font-display text-4xl">Consultor</h1>
          <p className="text-muted-foreground mt-1">Gerencie leads, perguntas e a marca da {brand?.nome_fantasia || "consultoria"}.</p>
        </div>

        <Tabs defaultValue="leads" className="w-full">
          <TabsList>
            <TabsTrigger value="leads">Leads</TabsTrigger>
            <TabsTrigger value="editor">Editor de formulário</TabsTrigger>
            <TabsTrigger value="brand">Marca</TabsTrigger>
          </TabsList>
          <TabsContent value="leads" className="mt-6"><LeadsPanel brand={brand} /></TabsContent>
          <TabsContent value="editor" className="mt-6"><QuestionsEditor /></TabsContent>
          <TabsContent value="brand" className="mt-6"><BrandingPanel brand={brand} onSaved={refresh} /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
