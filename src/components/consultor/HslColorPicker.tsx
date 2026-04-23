import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

/**
 * HSL color picker that syncs a native color picker (hex) with an HSL string
 * stored in the database (format: "210 65% 24%").
 */
export function HslColorPicker({
  value,
  onChange,
  placeholder,
}: {
  value: string | null | undefined;
  onChange: (hsl: string | null) => void;
  placeholder?: string;
}) {
  const [hex, setHex] = useState(() => hslStringToHex(value || "") || "#1e3a5f");
  const [text, setText] = useState(value || "");

  // Sync from external value changes
  useEffect(() => {
    setText(value || "");
    const h = hslStringToHex(value || "");
    if (h) setHex(h);
  }, [value]);

  const onPick = (newHex: string) => {
    setHex(newHex);
    const hsl = hexToHslString(newHex);
    setText(hsl);
    onChange(hsl);
  };

  const onText = (newText: string) => {
    setText(newText);
    onChange(newText.trim() ? newText : null);
    const h = hslStringToHex(newText);
    if (h) setHex(h);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={hex}
        onChange={(e) => onPick(e.target.value)}
        className="h-10 w-12 rounded border border-input cursor-pointer bg-background shrink-0"
      />
      <Input
        value={text}
        onChange={(e) => onText(e.target.value)}
        placeholder={placeholder || "210 65% 24%"}
        className="font-mono text-xs"
      />
    </div>
  );
}

export function hslStringToHex(hsl: string): string | null {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return null;
  const h = +m[1], s = +m[2] / 100, l = +m[3] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function hexToHslString(hex: string): string {
  const m = hex.replace("#", "").match(/.{2}/g);
  if (!m) return "210 65% 24%";
  const [r, g, b] = m.map((x) => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
