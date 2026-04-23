import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Upload, Trash2, Loader2 } from "lucide-react";

type ImageMeta = { width: number; height: number; bytes: number | null };

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
  recommended,
  previewClassName = "mt-2 h-24 w-full object-cover rounded-lg border border-border",
}: {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  /** Used as filename prefix to keep storage organized */
  field: string;
  label?: string;
  /** Free-form recommended size hint, e.g. "1920 × 1080 px" or "Quadrada, 512 × 512 px" */
  recommended?: string;
  previewClassName?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<ImageMeta | null>(null);

  // Load metadata when value changes (existing image)
  useEffect(() => {
    if (!value) {
      setMeta(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = async () => {
      if (cancelled) return;
      let bytes: number | null = null;
      try {
        const head = await fetch(value, { method: "HEAD" });
        const len = head.headers.get("content-length");
        if (len) bytes = parseInt(len, 10);
      } catch {
        // ignore
      }
      if (!cancelled) setMeta({ width: img.naturalWidth, height: img.naturalHeight, bytes });
    };
    img.onerror = () => !cancelled && setMeta(null);
    img.src = value;
    return () => {
      cancelled = true;
    };
  }, [value]);

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
      // Capture dimensions immediately from the uploaded file
      const dims = await readImageDimensions(file);
      setMeta({ width: dims?.width ?? 0, height: dims?.height ?? 0, bytes: file.size });
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
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.target.value = ""; // allow re-selecting same file
              }}
            />
          </label>
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={busy}>
            <Trash2 className="h-4 w-4 mr-1 text-destructive" /> Remover
          </Button>
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-1">
        {ALLOWED_LABEL} · até {MAX_SIZE_MB} MB
      </p>
      {value && (
        <>
          <img src={value} alt="" className={previewClassName} />
          {meta && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {meta.width > 0 && meta.height > 0 ? `${meta.width} × ${meta.height} px` : "—"}
              {meta.bytes != null && <> · {formatBytes(meta.bytes)}</>}
            </p>
          )}
        </>
      )}
    </div>
  );
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
