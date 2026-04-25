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
  daysUntilDue?: number
  overdue?: boolean
}

const InvoiceReminderEmail = ({ name, amount, dueDate, invoiceUrl, daysUntilDue, overdue }: Props) => {
  const heading = overdue ? 'Sua fatura está em atraso' : 'Lembrete de vencimento'
  const intro = overdue
    ? `${name ? `Olá, ${name}.` : 'Olá.'} Identificamos que sua fatura passou da data de vencimento.`
    : `${name ? `Olá, ${name}.` : 'Olá.'} Sua fatura vence ${daysUntilDue === 0 ? 'hoje' : daysUntilDue === 1 ? 'amanhã' : `em ${daysUntilDue} dias`}.`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{overdue ? 'Fatura em atraso' : 'Lembrete: sua fatura vence em breve'}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
          <Heading style={s.h1}>{heading}</Heading>
          <Text style={s.text}>{intro}</Text>
          <Section style={s.card}>
            <Text style={s.cardLabel}>Valor</Text>
            <Text style={s.cardValue}>{amount ?? '—'}</Text>
            {dueDate ? (
              <Text style={{ ...s.text, margin: '12px 0 0', fontSize: '13px' }}>
                Vencimento: <strong>{dueDate}</strong>
              </Text>
            ) : null}
          </Section>
          <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
            <Button style={s.button} href={invoiceUrl ?? 'https://prospekta.megadimensao.com.br/cliente/faturas'}>
              Pagar agora
            </Button>
          </Section>
          <Text style={s.text}>
            Se já efetuou o pagamento, desconsidere este lembrete.
          </Text>
          <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InvoiceReminderEmail,
  subject: (d) => d.overdue ? 'Fatura em atraso' : 'Lembrete: sua fatura vence em breve',
  displayName: 'Lembrete de fatura',
  previewData: { name: 'Joana', amount: 'R$ 1.250,00', dueDate: '30/04/2026', daysUntilDue: 3, overdue: false, invoiceUrl: 'https://prospekta.megadimensao.com.br/cliente/faturas' },
} satisfies TemplateEntry
