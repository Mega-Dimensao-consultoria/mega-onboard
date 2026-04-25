/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import * as s from './_styles.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  amount?: string
  dueDate?: string
  invoiceUrl?: string
  period?: string
}

const InvoiceCreatedEmail = ({ name, amount, dueDate, invoiceUrl, period }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Nova fatura disponível — {amount ?? ''}</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
        <Heading style={s.h1}>Nova fatura disponível</Heading>
        <Text style={s.text}>
          {name ? `Olá, ${name}.` : 'Olá.'} Geramos uma nova fatura referente
          {period ? ` ao período de ${period}` : ' ao seu contrato'}.
        </Text>
        <Section style={s.card}>
          <Text style={s.cardLabel}>Valor a pagar</Text>
          <Text style={s.cardValue}>{amount ?? '—'}</Text>
          {dueDate ? (
            <Text style={{ ...s.text, margin: '12px 0 0', fontSize: '13px' }}>
              Vencimento: <strong>{dueDate}</strong>
            </Text>
          ) : null}
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <Button style={s.button} href={invoiceUrl ?? 'https://prospekta.megadimensao.com.br/cliente/faturas'}>
            Ver fatura e pagar
          </Button>
        </Section>
        <Text style={s.text}>
          Você pode pagar via Pix (copia e cola) ou PayPal direto pela área do cliente.
          Após o pagamento, basta enviar o comprovante para confirmação.
        </Text>
        <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoiceCreatedEmail,
  subject: (d) => `Nova fatura disponível${d.amount ? ` — ${d.amount}` : ''}`,
  displayName: 'Nova fatura',
  previewData: { name: 'Joana', amount: 'R$ 1.250,00', dueDate: '30/04/2026', period: '01/04 a 30/04', invoiceUrl: 'https://prospekta.megadimensao.com.br/cliente/faturas' },
} satisfies TemplateEntry
