// Gera o BR Code Pix (EMV) com valor embutido — padrão Bacen.
// Suporta chaves: CPF, CNPJ, email, telefone (E.164), aleatória (UUID).

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC16-CCITT (polinômio 0x1021, init 0xFFFF) — exigido pelo padrão Pix
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(text: string, max: number): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 .,\-]/g, "")
    .slice(0, max);
}

export type PixPayloadInput = {
  pixKey: string;
  amountCents?: number;
  merchantName?: string;
  merchantCity?: string;
  txid?: string; // até 25 caracteres alfanuméricos
  description?: string; // até 50 caracteres
};

export function buildPixPayload(input: PixPayloadInput): string {
  const key = (input.pixKey || "").trim();
  if (!key) throw new Error("Chave Pix vazia");

  const amount = input.amountCents && input.amountCents > 0
    ? (input.amountCents / 100).toFixed(2)
    : null;

  const merchantName = sanitize(input.merchantName || "RECEBEDOR", 25);
  const merchantCity = sanitize(input.merchantCity || "BRASIL", 15);
  const txid = sanitize(input.txid || "***", 25) || "***";

  // Merchant Account Information (id 26) — GUI obrigatório + chave + descrição opcional
  const gui = tlv("00", "br.gov.bcb.pix");
  const keyTlv = tlv("01", key);
  const desc = input.description ? tlv("02", sanitize(input.description, 50)) : "";
  const mai = tlv("26", `${gui}${keyTlv}${desc}`);

  // Additional Data Field (id 62) com txid
  const adf = tlv("62", tlv("05", txid));

  let payload =
    tlv("00", "01") +              // Payload Format Indicator
    tlv("01", "12") +              // Point of Initiation Method (12 = uso único, 11 = reutilizável)
    mai +
    tlv("52", "0000") +            // Merchant Category Code
    tlv("53", "986") +             // Currency BRL
    (amount ? tlv("54", amount) : "") +
    tlv("58", "BR") +              // Country
    tlv("59", merchantName) +
    tlv("60", merchantCity) +
    adf;

  // CRC: adiciona o id "6304" e calcula sobre tudo (inclusive os 4 chars de id+len)
  payload += "6304";
  const crc = crc16(payload);
  return payload + crc;
}
