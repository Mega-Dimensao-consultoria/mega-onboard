-- Cron diário para gerar faturas e enviar lembretes
-- Armazena secret no Vault e agenda chamada da edge function

-- 1. Gerar e armazenar um secret para autenticar o cron
DO $$
DECLARE
  v_secret text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'invoice_cron_secret') THEN
    v_secret := encode(gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_secret, 'invoice_cron_secret', 'Secret para autenticar cron de faturas');
  END IF;
END $$;

-- 2. Armazenar a URL do projeto
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'project_url') THEN
    PERFORM vault.create_secret('https://cmxczcpqfkrqhpssxyzo.supabase.co', 'project_url', 'URL do projeto Supabase');
  END IF;
END $$;

-- 3. Agendar cron diário às 09:00 UTC (06:00 BRT)
SELECT cron.schedule(
  'generate-invoices-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/generate-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'invoice_cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);