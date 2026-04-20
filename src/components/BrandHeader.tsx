import { useBrand } from "@/hooks/useBrand";
import { Link } from "react-router-dom";

export function BrandHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
  const { brand } = useBrand();
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3 group">
          {brand?.logo_url ? (
            <img src={brand.logo_url} alt={brand.nome_fantasia || "Logo"} className="h-9 w-auto object-contain" />
          ) : (
            <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center font-display font-bold">
              {(brand?.nome_fantasia || "M")[0]}
            </div>
          )}
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold">{brand?.nome_fantasia || "Mega Dimensão"}</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Prospekta · Onboarding</div>
          </div>
        </Link>
        {rightSlot}
      </div>
    </header>
  );
}
