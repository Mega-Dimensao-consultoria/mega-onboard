

## Visão geral

Vamos transformar o Prospekta em uma plataforma com 3 grandes áreas:

1. **Público** — formulário de prospecção (já existe) + página de aceite de proposta (nova)
2. **Área do Cliente** (nova) — login, dashboard, contratos, faturas, serviços a la carte, troca de plano
3. **Área do Consultor** (expandida) — gestão de catálogo, planos, clientes, faturas, "logar como cliente"

Defaults assumidos (você não respondeu a 2ª rodada, então decidi):
- **Produtos**: planos recorrentes + serviços avulsos + add-ons recorrentes + orçamentos customizados (todos os 4)
- **Faturas**: geradas automaticamente no vencimento; cliente paga manualmente via Pix/PayPal pela fatura
- **Aceite**: acontece direto na página `/solucao/:id` (já existente) com botão "Aceitar proposta"
- **Acesso do consultor**: modelo misto — consultor edita tudo do painel admin + botão "visualizar como cliente" (read-only)

---

## 1. Modelo de dados (novas tabelas)

```text
profiles               id (=auth.uid), full_name, doc_type (cpf|cnpj),
                       doc_number, razao_social, nome_fantasia, endereco,
                       telefone, email, created_at

user_roles             id, user_id, role (consultor|cliente)  [tabela separada]

products               id, name, description, type
                       (plan|service|addon|custom), billing_cycle
                       (monthly|quarterly|yearly|one_time), price_cents,
                       active, sort_order

contracts              id, client_id (→profiles), lead_id (→leads),
                       status (active|paused|cancelled), accepted_at,
                       accepted_ip, started_at, notes

contract_items         id, contract_id, product_id, custom_price_cents,
                       custom_name, billing_cycle, quantity,
                       next_billing_at, active

invoices               id, contract_id, client_id, period_start,
                       period_end, due_date, subtotal_cents, total_cents,
                       status (open|paid|overdue|cancelled),
                       payment_method (pix|paypal|manual),
                       paid_at, payment_proof_url

invoice_items          id, invoice_id, contract_item_id,
                       description, amount_cents

payment_intents        id, invoice_id, provider (pix|paypal),
                       provider_ref, qr_code, copy_paste, status,
                       expires_at, raw_payload

audit_log              id, actor_user_id, action, target_type,
                       target_id, metadata, created_at
                       (registra impersonate, mudança de plano, etc.)
```

RLS: cliente só vê o que é seu (`client_id = auth.uid()`); consultor vê tudo via `has_role(auth.uid(), 'consultor')` (security definer function, padrão seguro).

---

## 2. Fluxo de aceite da proposta

```text
Cliente abre /solucao/:id
       │
       ▼
  Lê a solução técnica + preço estimado (se consultor preencheu)
       │
       ▼
  Botão "Aceitar proposta" → Wizard em 3 etapas:
       │
       ├─ Etapa 1: CPF ou CNPJ?
       │     - CPF: nome completo, telefone
       │     - CNPJ: digita CNPJ → consulta BrasilAPI
       │       → preenche razão social, nome fantasia, endereço,
       │          telefone, email automaticamente (editável)
       │
       ├─ Etapa 2: Email + senha + confirmação + celular
       │     - Cria conta via Lovable Cloud Auth (email+senha)
       │     - Envia código OTP de 6 dígitos por email
       │
       └─ Etapa 3: Cliente digita OTP → conta confirmada
             → cria profile + role 'cliente'
             → cria contract com status 'pending_setup'
             → vincula ao lead original
             → redireciona para /cliente
```

---

## 3. Área do Cliente (`/cliente/*`)

Layout com sidebar colapsável e header com nome + logout.

**Páginas:**
- `/cliente` — dashboard: próximo vencimento, status do contrato, ações rápidas
- `/cliente/contratos` — lista de contratos + detalhe (itens, valores, ciclos)
- `/cliente/faturas` — lista de faturas (open/paid/overdue), filtros por status
- `/cliente/faturas/:id` — detalhe + botões "Pagar com Pix" e "Pagar com PayPal"
- `/cliente/servicos` — catálogo de serviços a la carte que o consultor publicou
  → botão "Contratar" → cria contract_item adicional → próxima fatura inclui
- `/cliente/plano` — plano atual + botão "Trocar de plano" (lista alternativas)
- `/cliente/perfil` — dados cadastrais, alterar senha
- `/cliente/projetos` — visualização dos projetos contratados (status, descrição)

---

## 4. Pagamento Pix + PayPal (manual nesta versão)

**Pix:** ao clicar "Pagar com Pix", gera QR code estático com chave Pix configurada pelo consultor (em `brand_settings`) + valor + descrição. Cliente paga, faz upload do comprovante. Consultor confirma manualmente no painel → fatura vira `paid`.

**PayPal:** botão "Pagar com PayPal" abre link `paypal.me/<usuario>?amount=X` (configurado pelo consultor). Mesmo fluxo: cliente paga, anexa comprovante, consultor confirma.

> Pagamento automático (Stripe) fica para fase 2 — exige Lovable Pro e setup de conta. Estrutura do banco já fica preparada para receber webhooks depois.

---

## 5. Área do Consultor (expansão)

Tabs novos no `/consultor`:

- **Leads** (já existe)
- **Clientes** — lista de profiles com role cliente, filtros, busca, "Ver como cliente" (read-only impersonate via param de query, com banner "Você está visualizando como X")
- **Catálogo** — CRUD de products (planos, serviços, add-ons), preços, ciclos, ativar/desativar
- **Contratos** — lista todos os contratos, abrir, adicionar/remover itens, alterar valor custom, ativar/cancelar
- **Faturas** — lista todas as faturas, marcar como paga, gerar fatura avulsa, anexar comprovante
- **Configurações** (já existe / expandir) — branding + chave Pix + usuário PayPal + cron de geração de faturas

**Geração automática de faturas:** edge function `generate-invoices` rodando via pg_cron diariamente. Olha contract_items com `next_billing_at <= today`, cria fatura com vencimento +7 dias, atualiza `next_billing_at` para o próximo ciclo.

---

## 6. Migração do consultor para auth real

Hoje o consultor usa senha única + token HMAC. Vamos:
- Manter o login antigo funcionando durante a migração (compatibilidade)
- Criar uma conta real para o consultor primário (você define email/senha no primeiro acesso autenticado)
- Atribuir role `consultor` via `user_roles`
- Edge function `consultor-api` passa a aceitar JWT do Supabase (além do token antigo) e valida role
- Após login real funcionar, removemos o sistema antigo

---

## 7. Emails transacionais

Configurar infraestrutura de email da Lovable e criar templates:
- Código OTP de cadastro
- Boas-vindas após confirmar email
- Nova fatura disponível
- Fatura vencendo em 3 dias
- Pagamento confirmado
- Consultor adicionou novo serviço/plano

> Antes de habilitar, você precisará configurar um domínio de envio (ex: `notify.megadimensao.com.br`) na tela que vai aparecer.

---

## 8. Detalhes técnicos

- **Auth**: Lovable Cloud Auth com email+senha + Google opcional. Sessão real, sem `localStorage` de token bruto. Listener `onAuthStateChange` antes de `getSession`.
- **Roles**: tabela `user_roles` separada + função `has_role(uuid, app_role)` security definer (evita recursão de RLS).
- **CNPJ**: chamada client-side a `https://brasilapi.com.br/api/cnpj/v1/<cnpj>` — sem chave, sem custo. Tratar rate limit com mensagem amigável.
- **Validações**: Zod em todos os formulários e edge functions (CPF, CNPJ, email, telefone, valores).
- **Sanitização**: já existe DOMPurify para HTML; manter.
- **Audit log**: toda ação sensível (impersonate, mudança de plano, marcar fatura paga) grava em `audit_log`.
- **PDFs**: contrato gerado em PDF no aceite (reaproveita `src/lib/pdf.ts`), anexado ao contract.
- **i18n**: tudo em pt-BR (já é).

---

## 9. Entregas em ondas

Para reduzir risco, entrego em 4 ondas dentro deste mesmo MVP. Cada onda é testável de ponta a ponta:

1. **Onda A — Fundação**: auth real, roles, profiles, migração do consultor, CRUD de products
2. **Onda B — Aceite e contratos**: wizard de aceite, consulta CNPJ, criação de contract, área do cliente básica (dashboard + contratos)
3. **Onda C — Faturas e pagamento**: geração automática, listagem, pagamento Pix/PayPal manual, confirmação pelo consultor
4. **Onda D — Avançado**: serviços a la carte, troca de plano, "ver como cliente", emails transacionais, audit log completo

---

## 10. Fora desta entrega (fase 2)

Ficam mapeados mas não construídos agora:
- Stripe automático (Pix/PayPal com webhook)
- Notas fiscais (NF-e/NFS-e)
- Múltiplos consultores com permissões granulares
- Dashboard analítico (MRR, churn, LTV)
- App mobile / PWA offline
- Integrações com WhatsApp Business API
- Boleto bancário
- Split de pagamento

---

Quando aprovar, começo pela **Onda A**.

