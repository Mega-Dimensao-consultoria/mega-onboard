import { useBrand, type FooterLink } from "@/hooks/useBrand";

export function SiteFooter() {
  const { brand } = useBrand();
  const text = (brand?.footer_text || "© {year} Prospekta").replace(
    "{year}",
    String(new Date().getFullYear())
  );
  const links: FooterLink[] = Array.isArray(brand?.footer_links) ? brand!.footer_links! : [];

  return (
    <footer className="border-t border-border/60 py-6 mt-auto">
      <div className="container flex flex-col sm:flex-row gap-3 items-center justify-between text-xs text-muted-foreground">
        <span>{text}</span>
        {links.length > 0 && (
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {links.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target={l.url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="hover:text-primary transition"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}
      </div>
    </footer>
  );
}
