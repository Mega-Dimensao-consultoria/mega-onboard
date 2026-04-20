

## Problema

A submissão pública do formulário falha porque, na correção de segurança, o comando `REVOKE SELECT, UPDATE, DELETE ON public.leads FROM anon, authenticated;` foi executado — mas, mais importante, o `REVOKE` aplicado em `lead_answers` e o estado atual dos grants removeu também o `INSERT` necessário para o formulário público funcionar via `supabase-js` (cliente anônimo).

O `Index.tsx` insere diretamente em `leads` e `lead_answers` usando o cliente anônimo. Mesmo com policy "Anyone inserts leads" ativa, o Postgres exige o GRANT de INSERT na tabela para o role `anon` antes de avaliar a RLS.

## Correção

### 1. Migration SQL — restaurar INSERT público
Restaurar explicitamente o privilégio `INSERT` para `anon` e `authenticated` nas duas tabelas que recebem dados do formulário público, mantendo SELECT/UPDATE/DELETE bloqueados:

```sql
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT INSERT ON public.lead_answers TO anon, authenticated;
```

As policies existentes ("Anyone inserts leads" / "Anyone inserts answers") continuam controlando a regra de segurança — apenas INSERT é permitido, leitura/edição continuam restritas ao service role via edge function.

### 2. Melhorar mensagem de erro no frontend
Em `src/pages/Index.tsx`, no `catch` do `handleSubmit`, logar o erro completo no console para diagnóstico futuro (atualmente só mostra `e.message` no toast, dificultando debug).

## Resultado

- Formulário público volta a enviar leads + respostas com sucesso.
- Painel `/consultor` continua sendo a única forma de **ler** os leads (via edge function com service role).
- Modelo de segurança preservado: público só insere, nunca lê/edita.

