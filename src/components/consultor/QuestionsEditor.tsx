import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { consultor } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GitBranch, GripVertical } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Q = {
  id: string; step: number; step_title: string | null; order_index: number;
  label: string; field_type: string; options: { label: string; value: string }[];
  mask: string | null; required: boolean | null;
  depends_on: string | null; depends_value: string | null;
};

const FIELD_TYPES = [
  { v: "text", l: "Texto curto" },
  { v: "textarea", l: "Texto longo" },
  { v: "email", l: "E-mail" },
  { v: "radio", l: "Escolha única (radio)" },
  { v: "select", l: "Seleção (dropdown)" },
  { v: "select_multi", l: "Seleção múltipla" },
  { v: "masked", l: "Texto com máscara" },
];

export function QuestionsEditor() {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [editing, setEditing] = useState<Partial<Q> | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    const { data } = await supabase.from("form_questions").select("*").order("step").order("order_index");
    setQuestions((data as unknown as Q[]) || []);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.label || !editing.field_type) return toast({ title: "Preencha pergunta e tipo", variant: "destructive" });
    try {
      await consultor.call("save-question", { question: editing });
      toast({ title: "Pergunta salva" });
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

  // Group by step preserving order
  const grouped = questions.reduce((acc, q) => {
    (acc[q.step] = acc[q.step] || []).push(q);
    return acc;
  }, {} as Record<number, Q[]>);
  const stepKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  const handleDragEnd = async (step: number, e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const list = grouped[step];
    const oldIdx = list.findIndex((q) => q.id === active.id);
    const newIdx = list.findIndex((q) => q.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const newList = arrayMove(list, oldIdx, newIdx).map((q, i) => ({ ...q, order_index: i + 1 }));
    // Optimistic update
    const others = questions.filter((q) => q.step !== step);
    setQuestions([...others, ...newList].sort((a, b) => a.step - b.step || a.order_index - b.order_index));

    setSavingOrder(true);
    try {
      await consultor.call("reorder-questions", {
        items: newList.map((q) => ({ id: q.id, step: q.step, order_index: q.order_index })),
      });
    } catch (err) {
      toast({ title: "Erro ao salvar ordem", variant: "destructive" });
      load();
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Arraste <GripVertical className="inline h-3.5 w-3.5" /> para reordenar. Clique em <Pencil className="inline h-3.5 w-3.5" /> para editar rapidamente.
          </p>
          {savingOrder && <p className="text-xs text-primary mt-1">Salvando nova ordem…</p>}
        </div>
        <Button onClick={() => setEditing({
          step: stepKeys[stepKeys.length - 1] || 1,
          order_index: 99, field_type: "text", required: true, options: [],
        })}>
          <Plus className="h-4 w-4 mr-2" /> Nova pergunta
        </Button>
      </div>

      {stepKeys.map((step) => {
        const qs = grouped[step];
        return (
          <div key={step} className="bg-card rounded-2xl border border-border/60 overflow-hidden">
            <div className="px-5 py-3 bg-secondary/50 border-b border-border/60">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Etapa {step}</div>
              <div className="font-display text-lg">{qs[0]?.step_title || "—"}</div>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(step, e)}>
              <SortableContext items={qs.map((q) => q.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-border/50">
                  {qs.map((q) => (
                    <SortableRow
                      key={q.id}
                      q={q}
                      parent={q.depends_on ? questions.find((x) => x.id === q.depends_on) || null : null}
                      onEdit={() => setEditing(q)}
                      onDelete={() => remove(q.id)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </div>
        );
      })}

      <QuickEditDialog
        editing={editing}
        questions={questions}
        onClose={() => setEditing(null)}
        onChange={setEditing}
        onSave={save}
      />
    </div>
  );
}

function SortableRow({
  q, parent, onEdit, onDelete,
}: {
  q: Q; parent: Q | null; onEdit: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: q.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : "auto" as const,
  };
  const fieldTypeLabel = FIELD_TYPES.find((t) => t.v === q.field_type)?.l || q.field_type;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-3 bg-card ${isDragging ? "shadow-elegant" : ""}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-2 -ml-1 rounded hover:bg-secondary cursor-grab active:cursor-grabbing text-muted-foreground"
        aria-label="Arrastar para reordenar"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onEdit}>
        <div className="font-medium truncate">{q.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
          <span className="px-2 py-0.5 rounded bg-secondary">{fieldTypeLabel}</span>
          {!q.required && <span className="px-2 py-0.5 rounded bg-secondary text-muted-foreground">opcional</span>}
          {parent && (
            <span className="inline-flex items-center gap-1 text-primary/80">
              <GitBranch className="h-3 w-3" />
              se "{parent.label.slice(0, 40)}" = "{q.depends_value}"
            </span>
          )}
        </div>
      </div>
      <Button size="icon" variant="ghost" onClick={onEdit} title="Editar"><Pencil className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onDelete} title="Excluir">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}

function QuickEditDialog({
  editing, questions, onClose, onChange, onSave,
}: {
  editing: Partial<Q> | null;
  questions: Q[];
  onClose: () => void;
  onChange: (q: Partial<Q>) => void;
  onSave: () => void;
}) {
  const needsOptions = editing && ["radio", "select", "select_multi"].includes(editing.field_type || "");

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing?.id ? "Editar pergunta" : "Nova pergunta"}
          </DialogTitle>
        </DialogHeader>

        {editing && (
          <div className="space-y-4">
            <div>
              <Label>Pergunta</Label>
              <Input
                autoFocus
                value={editing.label || ""}
                onChange={(e) => onChange({ ...editing, label: e.target.value })}
                placeholder="Ex: Qual seu nome completo?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de campo</Label>
                <Select value={editing.field_type} onValueChange={(v) => onChange({ ...editing, field_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etapa</Label>
                <Input
                  type="number" min={1}
                  value={editing.step ?? 1}
                  onChange={(e) => onChange({ ...editing, step: Number(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Título da etapa (opcional)</Label>
              <Input
                value={editing.step_title || ""}
                onChange={(e) => onChange({ ...editing, step_title: e.target.value })}
                placeholder="Ex: Identificação"
              />
            </div>

            {needsOptions && (
              <div>
                <Label>Opções</Label>
                <p className="text-xs text-muted-foreground mb-2">Uma por linha. Formato: <code className="px-1 bg-secondary rounded">rótulo|valor</code> (ou só o rótulo).</p>
                <textarea
                  className="w-full min-h-[110px] rounded-md border border-input bg-background p-3 text-sm font-mono"
                  value={(editing.options || []).map((o) => o.label === o.value ? o.label : `${o.label}|${o.value}`).join("\n")}
                  onChange={(e) => {
                    const opts = e.target.value.split("\n").filter(Boolean).map((line) => {
                      const [label, value] = line.split("|");
                      return { label: label?.trim() || "", value: (value ?? label)?.trim() || "" };
                    });
                    onChange({ ...editing, options: opts });
                  }}
                />
              </div>
            )}

            {editing.field_type === "masked" && (
              <div>
                <Label>Máscara</Label>
                <Input
                  value={editing.mask || ""}
                  onChange={(e) => onChange({ ...editing, mask: e.target.value })}
                  placeholder="(99) 99999-9999"
                />
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Obrigatória</div>
                <div className="text-xs text-muted-foreground">O usuário precisa responder para avançar.</div>
              </div>
              <Switch
                checked={editing.required ?? true}
                onCheckedChange={(c) => onChange({ ...editing, required: c })}
              />
            </div>

            <details className="rounded-lg border border-border/60 p-3 group">
              <summary className="cursor-pointer text-sm font-medium flex items-center gap-2">
                <GitBranch className="h-4 w-4" /> Lógica condicional (avançado)
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-muted-foreground">Mostrar esta pergunta apenas se outra tiver determinado valor.</p>
                <Select
                  value={editing.depends_on || "none"}
                  onValueChange={(v) => onChange({ ...editing, depends_on: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pergunta…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— sem condição —</SelectItem>
                    {questions.filter((q) => q.id !== editing.id).map((q) => (
                      <SelectItem key={q.id} value={q.id}>{q.label.slice(0, 70)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Valor esperado (ex: PF, Loja Virtual)"
                  value={editing.depends_value || ""}
                  onChange={(e) => onChange({ ...editing, depends_value: e.target.value })}
                  disabled={!editing.depends_on}
                />
              </div>
            </details>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
