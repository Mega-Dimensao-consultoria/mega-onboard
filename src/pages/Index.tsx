import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IMaskInput } from "react-imask";
import { supabase } from "@/integrations/supabase/client";
import { BrandHeader } from "@/components/BrandHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, ArrowRight, ArrowLeft, Sparkles, UserCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useBrand } from "@/hooks/useBrand";
import { SiteFooter } from "@/components/SiteFooter";

type Question = {
  id: string;
  step: number;
  step_title: string | null;
  order_index: number;
  label: string;
  field_type: string;
  options: { label: string; value: string }[];
  mask: string | null;
  required: boolean | null;
  depends_on: string | null;
  depends_value: string | null;
};

type Answers = Record<string, string | string[] | undefined>;

const Index = () => {
  const { brand } = useBrand();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [stepIdx, setStepIdx] = useState(0); // 0 = welcome, then 1..N steps, then success
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    supabase
      .from("form_questions")
      .select("*")
      .order("step", { ascending: true })
      .order("order_index", { ascending: true })
      .then(({ data }) => setQuestions((data as unknown as Question[]) || []));
  }, []);

  const steps = useMemo(() => {
    const map = new Map<number, { step: number; title: string; questions: Question[] }>();
    for (const q of questions) {
      if (!map.has(q.step)) map.set(q.step, { step: q.step, title: q.step_title || `Etapa ${q.step}`, questions: [] });
      map.get(q.step)!.questions.push(q);
    }
    return Array.from(map.values()).sort((a, b) => a.step - b.step);
  }, [questions]);

  const isVisible = (q: Question): boolean => {
    if (!q.depends_on) return true;
    const parent = questions.find((x) => x.id === q.depends_on);
    if (!parent || !isVisible(parent)) return false;
    const v = answers[q.depends_on];
    if (Array.isArray(v)) return v.includes(q.depends_value || "");
    return v === q.depends_value;
  };

  const currentStep = steps[stepIdx - 1];
  const visibleQs = currentStep ? currentStep.questions.filter(isVisible) : [];

  const setAnswer = (id: string, val: string | string[]) => {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  };

  const validateStep = () => {
    for (const q of visibleQs) {
      if (!q.required) continue;
      const v = answers[q.id];
      if (Array.isArray(v) ? v.length === 0 : !v) {
        toast({ title: "Campo obrigatório", description: q.label, variant: "destructive" });
        return false;
      }
      if (q.field_type === "email" && typeof v === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        toast({ title: "E-mail inválido", description: q.label, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (stepIdx < steps.length) setStepIdx(stepIdx + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Pull contact info heuristically
      const findByLabel = (sub: string) =>
        questions.find((q) => q.label.toLowerCase().includes(sub.toLowerCase()))?.id;
      const emailId = findByLabel("e-mail");
      const waId = findByLabel("whatsapp");
      const nameId = findByLabel("nome completo") || findByLabel("razão social");
      const solId = findByLabel("qual solução");

      // Generate the lead id client-side so we don't need SELECT permission after insert
      const leadId = crypto.randomUUID();
      const lead = {
        id: leadId,
        contact_name: nameId ? (answers[nameId] as string) : null,
        contact_email: emailId ? (answers[emailId] as string) : null,
        contact_whatsapp: waId ? (answers[waId] as string) : null,
        solution_type: solId ? (answers[solId] as string) : null,
      };

      const { error: leadErr } = await supabase.from("leads").insert(lead);
      if (leadErr) throw leadErr;

      const visibleAll = questions.filter(isVisible);
      const rows = visibleAll
        .filter((q) => answers[q.id] !== undefined)
        .map((q) => ({
          lead_id: leadId,
          question_id: q.id,
          question_label: q.label,
          answer: Array.isArray(answers[q.id])
            ? (answers[q.id] as string[]).join(", ")
            : String(answers[q.id]),
        }));
      if (rows.length) {
        const { error: ansErr } = await supabase.from("lead_answers").insert(rows);
        if (ansErr) throw ansErr;
      }

      setDone(true);
    } catch (e) {
      console.error("Erro ao enviar formulário:", e);
      const description =
        e instanceof Error ? e.message : typeof e === "object" ? JSON.stringify(e) : String(e);
      toast({ title: "Erro ao enviar", description, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col">
        <BrandHeader />
        <main className="flex-1 grid place-items-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-xl">
            <CheckCircle2 className="mx-auto h-16 w-16 text-accent mb-6" />
            <h1 className="font-display text-4xl mb-3">{brand?.success_title || "Tudo certo!"}</h1>
            <p className="text-muted-foreground text-lg">
              {brand?.success_message || "Recebemos suas respostas. Em breve um consultor entrará em contato."}
            </p>
          </motion.div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-secondary/30">
      <BrandHeader rightSlot={
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium transition"
        >
          <UserCircle2 className="h-4 w-4" />
          <span className="hidden sm:inline">{brand?.client_login_cta || "Acesse sua área do cliente"}</span>
          <span className="sm:hidden">Área do cliente</span>
        </Link>
      } />

      <main className="flex-1 container max-w-3xl py-10 md:py-16">
        <AnimatePresence mode="wait">
          {stepIdx === 0 ? (
            <motion.section
              key="welcome"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-1.5 text-xs font-medium tracking-wide uppercase mb-6">
                <Sparkles className="h-3.5 w-3.5" /> {brand?.hero_badge || "Onboarding inteligente"}
              </div>
              <h1 className="font-display text-5xl md:text-6xl text-balance leading-[1.05] mb-6">
                {renderHeroTitle(brand?.hero_title || "Vamos desenhar o projeto certo para você.")}
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
                {brand?.hero_subtitle || "Em poucos minutos, você responde as perguntas estratégicas que orientam o briefing técnico do seu projeto."}
              </p>
              <Button size="lg" className="h-14 px-8 text-base" onClick={() => setStepIdx(1)}>
                {brand?.hero_cta_label || "Começar agora"} <ArrowRight className="ml-2 h-5 w-5" />
              </Button>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16">
                {steps.map((s, i) => (
                  <div key={s.step} className="rounded-lg border border-border/60 bg-card p-4 text-left">
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Etapa {i + 1}</div>
                    <div className="font-display text-lg mt-1">{s.title}</div>
                  </div>
                ))}
              </div>
            </motion.section>
          ) : currentStep ? (
            <motion.section
              key={`step-${stepIdx}`}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
            >
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full transition ${i < stepIdx ? "bg-primary" : "bg-border"}`} />
                  ))}
                </div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Etapa {stepIdx} de {steps.length}</div>
                <h2 className="font-display text-3xl md:text-4xl mt-1">{currentStep.title}</h2>
              </div>

              <div className="space-y-6 bg-card rounded-2xl border border-border/60 p-6 md:p-8 shadow-elegant">
                {visibleQs.map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <Label className="text-base font-medium">{q.label}</Label>
                    {renderField(q, answers, setAnswer)}
                  </motion.div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-8">
                <Button variant="ghost" onClick={() => setStepIdx(Math.max(0, stepIdx - 1))} disabled={stepIdx === 0}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button size="lg" onClick={handleNext} disabled={submitting}>
                  {stepIdx === steps.length ? (submitting ? "Enviando..." : "Concluir") : "Continuar"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </main>

      <SiteFooter />
    </div>
  );
};

function renderField(
  q: Question,
  answers: Answers,
  setAnswer: (id: string, v: string | string[]) => void
) {
  const v = answers[q.id];

  if (q.field_type === "text" || q.field_type === "email") {
    return (
      <Input
        type={q.field_type === "email" ? "email" : "text"}
        value={(v as string) || ""}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        placeholder="Digite aqui..."
        className="h-12"
      />
    );
  }
  if (q.field_type === "textarea") {
    return (
      <Textarea
        value={(v as string) || ""}
        onChange={(e) => setAnswer(q.id, e.target.value)}
        rows={4}
        placeholder="Conte-nos com detalhes..."
      />
    );
  }
  if (q.field_type === "masked") {
    // Convert legacy "9" digit-placeholders to IMask's "0" definition so users can type real numbers
    const mask = (q.mask || "").replace(/9/g, "0");
    return (
      <IMaskInput
        mask={mask}
        value={(v as string) || ""}
        onAccept={(val: string) => setAnswer(q.id, val)}
        placeholder={mask}
        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    );
  }
  if (q.field_type === "radio") {
    return (
      <RadioGroup value={(v as string) || ""} onValueChange={(val) => setAnswer(q.id, val)} className="grid gap-2">
        {q.options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition ${
              v === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
            }`}
          >
            <RadioGroupItem value={opt.value} />
            <span>{opt.label}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }
  if (q.field_type === "select") {
    return (
      <Select value={(v as string) || ""} onValueChange={(val) => setAnswer(q.id, val)}>
        <SelectTrigger className="h-12"><SelectValue placeholder="Selecione..." /></SelectTrigger>
        <SelectContent>
          {q.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  if (q.field_type === "select_multi") {
    const arr = (v as string[]) || [];
    return (
      <div className="grid sm:grid-cols-2 gap-2">
        {q.options.map((opt) => {
          const checked = arr.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              }`}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => {
                  if (c) setAnswer(q.id, [...arr, opt.value]);
                  else setAnswer(q.id, arr.filter((x) => x !== opt.value));
                }}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    );
  }
  return null;
}

function renderHeroTitle(title: string) {
  // Suporta *destaque* renderizado em itálico/cor primária
  const parts = title.split(/(\*[^*]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*") ? (
      <span key={i} className="italic text-primary">{p.slice(1, -1)}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default Index;
