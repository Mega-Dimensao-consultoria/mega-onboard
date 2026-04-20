import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { consultor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GitBranch } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Q = {
  id: string; step: number; step_title: string | null; order_index: number;
  label: string; field_type: string; options: { label: string; value: string }[];
  mask: string | null; required: boolean | null;
  depends_on: string | null; depends_value: string | null;
};

const FIELD_TYPES = ["text", "textarea", "email", "radio", "select", "select_multi", "masked"];

export function QuestionsEditor() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [editing, setEditing] = useState<Partial<Q> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("form_questions").select("*").order("step").order("order_index");
    setQuestions((data as unknown as Q[]) || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.label || !editing.field_type) return toast({ title: "Preencha rótulo e tipo", variant: "destructive" });
    try {
      await consultor.call("save-question", { question: editing });
      toast({ title: "Salvo!" });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: "Erro", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta pergunta?")) return;
    await consultor.call("delete-question", { id });
    load();
  };

  const grouped = questions.reduce((acc, q) => {
    (acc[q.step] = acc[q.step] || []).push(q);
    return acc;
  }, {} as Record<number, Q[]>);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Edite perguntas, tipos de campo e a lógica condicional.</p>
        <Button onClick={() => setEditing({ step: 1, order_index: 99, field_type: "text", required: true, options: [] })}>
          <Plus className="h-4 w-4 mr-2" /> Nova pergunta
        </Button>
      </div>

      {Object.entries(grouped).map(([step, qs]) => (
        <div key={step} className="bg-card rounded-2xl border border-border/60 overflow-hidden">
          <div className="px-5 py-3 bg-secondary/50 border-b border-border/60">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Etapa {step}</div>
            <div className="font-display text-lg">{qs[0]?.step_title || "—"}</div>
          </div>
          <div className="divide-y divide-border/50">
            {qs.map((q) => {
              const parent = q.depends_on ? questions.find((x) => x.id === q.depends_on) : null;
              return (
                <div key={q.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{q.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-secondary">{q.field_type}</span>
                      {parent && (
                        <span className="inline-flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          Mostrar se "{parent.label}" = "{q.depends_value}"
                        </span>
                      )}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setEditing(q)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar pergunta" : "Nova pergunta"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Etapa</Label>
                  <Input type="number" value={editing.step ?? 1} onChange={(e) => setEditing({ ...editing, step: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Label>Título da etapa</Label>
                  <Input value={editing.step_title || ""} onChange={(e) => setEditing({ ...editing, step_title: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Pergunta</Label>
                <Input value={editing.label || ""} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.field_type} onValueChange={(v) => setEditing({ ...editing, field_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.order_index ?? 0} onChange={(e) => setEditing({ ...editing, order_index: Number(e.target.value) })} />
                </div>
              </div>
              {(editing.field_type === "radio" || editing.field_type === "select" || editing.field_type === "select_multi") && (
                <div>
                  <Label>Opções (uma por linha, formato: rótulo|valor)</Label>
                  <textarea
                    className="w-full min-h-[120px] rounded-md border border-input bg-background p-3 text-sm"
                    value={(editing.options || []).map((o) => `${o.label}|${o.value}`).join("\n")}
                    onChange={(e) => {
                      const opts = e.target.value.split("\n").filter(Boolean).map((line) => {
                        const [label, value] = line.split("|");
                        return { label: label?.trim() || "", value: (value ?? label)?.trim() || "" };
                      });
                      setEditing({ ...editing, options: opts });
                    }}
                  />
                </div>
              )}
              {editing.field_type === "masked" && (
                <div>
                  <Label>Máscara (ex: (99) 99999-9999)</Label>
                  <Input value={editing.mask || ""} onChange={(e) => setEditing({ ...editing, mask: e.target.value })} />
                </div>
              )}
              <div className="border-t pt-4">
                <Label className="text-sm">Lógica condicional (opcional)</Label>
                <p className="text-xs text-muted-foreground mb-2">Mostrar esta pergunta apenas se outra tiver determinado valor.</p>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={editing.depends_on || "none"} onValueChange={(v) => setEditing({ ...editing, depends_on: v === "none" ? null : v })}>
                    <SelectTrigger><SelectValue placeholder="Pergunta..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— sem condição —</SelectItem>
                      {questions.filter((q) => q.id !== editing.id).map((q) => (
                        <SelectItem key={q.id} value={q.id}>{q.label.slice(0, 60)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Valor esperado" value={editing.depends_value || ""} onChange={(e) => setEditing({ ...editing, depends_value: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
