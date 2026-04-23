import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HomeSection } from "@/hooks/useBrand";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Quote, ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FeatureItem = { title: string; description: string };
type TestimonialItem = { name: string; role?: string; quote: string };
type FaqItem = { question: string; answer: string };
type LogoItem = { name: string; url: string };
type CtaContent = { button_label?: string; button_url?: string };

export function HomeSections() {
  const [sections, setSections] = useState<HomeSection[]>([]);

  useEffect(() => {
    supabase
      .from("home_sections")
      .select("*")
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => setSections((data as unknown as HomeSection[]) || []));
  }, []);

  if (!sections.length) return null;

  return (
    <div className="mt-20 space-y-20">
      {sections.map((s) => (
        <section key={s.id}>
          {(s.title || s.subtitle) && (
            <div className="text-center mb-10 max-w-2xl mx-auto">
              {s.title && <h2 className="font-display text-3xl md:text-4xl">{s.title}</h2>}
              {s.subtitle && <p className="text-muted-foreground mt-3">{s.subtitle}</p>}
            </div>
          )}
          {renderKind(s)}
        </section>
      ))}
    </div>
  );
}

function renderKind(s: HomeSection) {
  switch (s.kind) {
    case "features": {
      const items = (s.content as FeatureItem[]) || [];
      return (
        <div className="grid md:grid-cols-3 gap-4">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-6">
              <CheckCircle2 className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-display text-lg">{it.title}</h3>
              <p className="text-sm text-muted-foreground mt-2">{it.description}</p>
            </div>
          ))}
        </div>
      );
    }
    case "testimonials": {
      const items = (s.content as TestimonialItem[]) || [];
      return (
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <blockquote key={i} className="rounded-2xl border border-border/60 bg-card p-6">
              <Quote className="h-6 w-6 text-primary mb-3" />
              <p className="italic">"{it.quote}"</p>
              <footer className="mt-4 text-sm">
                <div className="font-medium">{it.name}</div>
                {it.role && <div className="text-muted-foreground">{it.role}</div>}
              </footer>
            </blockquote>
          ))}
        </div>
      );
    }
    case "faq": {
      const items = (s.content as FaqItem[]) || [];
      return (
        <div className="max-w-2xl mx-auto bg-card border border-border/60 rounded-2xl p-2">
          <Accordion type="single" collapsible>
            {items.map((it, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="px-4 text-left">{it.question}</AccordionTrigger>
                <AccordionContent className="px-4 text-muted-foreground">{it.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      );
    }
    case "logos": {
      const items = (s.content as LogoItem[]) || [];
      return (
        <div className="flex flex-wrap items-center justify-center gap-8">
          {items.map((it, i) => (
            <img
              key={i}
              src={it.url}
              alt={it.name}
              className="h-10 w-auto object-contain opacity-70 hover:opacity-100 transition"
            />
          ))}
        </div>
      );
    }
    case "cta": {
      const c = (s.content as CtaContent) || {};
      if (!c.button_label) return null;
      return (
        <div className="text-center">
          <Button asChild size="lg">
            <a href={c.button_url || "#"}>
              {c.button_label} <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      );
    }
    default:
      return null;
  }
}
