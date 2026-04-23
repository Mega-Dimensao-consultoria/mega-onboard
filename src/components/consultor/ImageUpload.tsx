import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2 } from "lucide-react";

const BUCKET = "brand-assets";
const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const ALLOWED_LABEL = "JPG, PNG, WEBP, GIF ou SVG";

/**
 * Extracts the storage path from a public URL of the brand-assets bucket.
 * Returns null if the URL is not from this bucket (e.g., external URL).
 */
function pathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.substring(idx + marker.length));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ImageUpload({
  value,
  onChange,
  field,
  label,
  previewClassName = "mt-2 h-24 w-full object-cover rounded-lg border border-border",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Used as filename prefix to keep storage organized */
  field: string;
  label?: string;
  previewClassName?: string;
}) {
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: `Envie uma imagem (${ALLOWED_LABEL}). Você enviou: ${file.type || "tipo desconhecido"}.`,
        variant: "destructive",
      });
      return;
    }
    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: "Arquivo muito grande",
        description: `O limite é ${MAX_SIZE_MB} MB. O arquivo enviado tem ${formatBytes(file.size)}.`,
        variant: "destructive",
      });
      return;
    }
    if (file.size === 0) {
      toast({
        title: "Arquivo vazio",
        description: "O arquivo selecionado está vazio.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      // Delete old file if it was in our bucket
      const oldPath = pathFromPublicUrl(value);
      if (oldPath && oldPath !== path) {
        await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
      }

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
      toast({ title: "Imagem enviada" });
    } catch (e) {
      toast({
        title: "Erro no upload",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const oldPath = pathFromPublicUrl(value);
    if (oldPath) {
      await supabase.storage.from(BUCKET).remove([oldPath]).catch(() => {});
    }
    onChange(null);
  };

  return (
    <div>
      {label && <div className="text-sm font-medium mb-1">{label}</div>}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
          <label className="cursor-pointer">
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
            {value ? "Trocar imagem" : "Enviar imagem"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Remover
          </Button>
        )}
      </div>
      {value && <img src={value} alt="" className={previewClassName} />}
    </div>
  );
}
