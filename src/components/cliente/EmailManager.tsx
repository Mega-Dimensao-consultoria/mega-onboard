import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClientId } from "@/hooks/useClientId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Mail, Plus, Trash2, Key, Loader2, RefreshCw } from "lucide-react";

type EmailAccount = {
  user: string;
  domain: string;
  email: string;
  quota: string;
  _diskused: string;
};

export function EmailManager({ cpanelUser }: { cpanelUser: string }) {
  const { clientId } = useClientId();
  const [emails, setEmails] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  
  const [newEmail, setNewEmail] = useState({ user: "", password: "", domain: "" });
  const [open, setOpen] = useState(false);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { action: "list_emails", cpanel_user: cpanelUser }
      });
      if (error) throw error;
      if (data?.ok && data.result?.data) {
        setEmails(data.result.data);
        if (data.result.data.length > 0 && !newEmail.domain) {
          setNewEmail(n => ({ ...n, domain: data.result.data[0].domain }));
        }
      }
    } catch (e) {
      toast({ title: "Erro ao carregar e-mails", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cpanelUser) loadEmails();
  }, [cpanelUser]);

  const addEmail = async () => {
    if (!newEmail.user || !newEmail.password || !newEmail.domain) {
      return toast({ title: "Preencha todos os campos", variant: "destructive" });
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { 
          action: "add_email", 
          cpanel_user: cpanelUser,
          email_user: newEmail.user,
          email_password: newEmail.password,
          domain: newEmail.domain
        }
      });
      if (error) throw error;
      if (data?.ok && data.result?.status === 1) {
        toast({ title: "E-mail criado com sucesso!" });
        setOpen(false);
        setNewEmail({ ...newEmail, user: "", password: "" });
        loadEmails();
      } else {
        throw new Error(data?.result?.errors?.[0] || "Erro desconhecido");
      }
    } catch (e) {
      toast({ title: "Erro ao criar e-mail", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const deleteEmail = async (email: EmailAccount) => {
    if (!confirm(`Remover conta ${email.email}? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { 
          action: "delete_email", 
          cpanel_user: cpanelUser,
          email_user: email.user,
          domain: email.domain
        }
      });
      if (error) throw error;
      toast({ title: "E-mail removido" });
      loadEmails();
    } catch (e) {
      toast({ title: "Erro ao remover", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (email: EmailAccount) => {
    const pw = prompt(`Digite a nova senha para ${email.email}:`);
    if (!pw) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("whm-integration", {
        body: { 
          action: "change_email_password", 
          cpanel_user: cpanelUser,
          email_user: email.user,
          email_password: pw,
          domain: email.domain
        }
      });
      if (error) throw error;
      toast({ title: "Senha atualizada" });
    } catch (e) {
      toast({ title: "Erro ao atualizar senha", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" /> Contas de E-mail
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadEmails} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Criar nova conta de e-mail</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <div className="flex items-center gap-2">
                    <Input value={newEmail.user} onChange={e => setNewEmail({ ...newEmail, user: e.target.value })} placeholder="ex: contato" />
                    <span className="text-muted-foreground">@{newEmail.domain}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={newEmail.password} onChange={e => setNewEmail({ ...newEmail, password: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={addEmail} disabled={busy}>{busy ? <Loader2 className="animate-spin h-4 w-4" /> : "Criar"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Carregando contas de e-mail…</CardContent></Card>
      ) : emails.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma conta de e-mail criada.</CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {emails.map((email) => (
            <Card key={email.email} className="overflow-hidden">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">{email.email}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Cota: {email.quota === "0" ? "Ilimitada" : email.quota} · Usado: {email._diskused}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => changePassword(email)} title="Alterar Senha">
                    <Key className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteEmail(email)} title="Excluir">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}