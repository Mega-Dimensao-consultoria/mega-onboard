import { useBrand } from "@/hooks/useBrand";
import { Link } from "react-router-dom";

export function BrandHeader({
  rightSlot,
  scope = "public",
}: {
  rightSlot?: React.ReactNode;
  scope?: "public" | "cliente";
}) {
  const { brand } = useBrand(scope);
  const logo = scope === "cliente" && brand?.client_logo_url ? brand.client_logo_url : brand?.logo_url;
  const navLinks = Array.isArray(brand?.nav_links) ? brand!.nav_links! : [];

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16 gap-4">
        <Link to="/" className="flex items-center gap-3 group min-w-0">
          {logo ? (
            <img src={logo} alt={brand?.nome_fantasia || "Logo"} className="h-9 w-auto object-contain" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-bold">
              {(brand?.nome_fantasia || "M")[0]}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <div className="font-display text-lg font-semibold truncate">{brand?.nome_fantasia || "Mega Dimensão"}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground truncate">Prospekta · Onboarding</div>
          </div>
        </Link>

        {scope === "public" && navLinks.length > 0 && (
          <nav className="hidden md:flex items-center gap-5 text-sm">
            {navLinks.map((l, i) => (
              <a
                key={i}
                href={l.url}
                target={l.url.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="text-muted-foreground hover:text-primary transition"
              >
                {l.label}
              </a>
            ))}
          </nav>
        )}

        {rightSlot}
      </div>
    </header>
  );
}
