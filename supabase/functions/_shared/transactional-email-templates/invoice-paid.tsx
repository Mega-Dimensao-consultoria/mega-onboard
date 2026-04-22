/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import * as s from './_styles.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  amount?: string
  paidAt?: string
  invoiceUrl?: string
  method?: string
}

const InvoicePaidEmail = ({ name, amount, paidAt, invoiceUrl, method }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Recebemos seu pagamento — obrigado!</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
        <Heading style={s.h1}>Pagamento confirmado</Heading>
        <Text style={s.text}>
          {name ? `Olá, ${name}.` : 'Olá.'} Recebemos e confirmamos seu pagamento. Obrigado pela parceria!
        </Text>
        <Section style={s.card}>
          <Text style={s.cardLabel}>Valor pago</Text>
          <Text style={s.cardValue}>{amount ?? '—'}</Text>
          {paidAt ? (
            <Text style={{ ...s.text, margin: '12px 0 0', fontSize: '13px' }}>
              Confirmado em: <strong>{paidAt}</strong>{method ? ` · via ${method}` : ''}
            </Text>
          ) : null}
        </Section>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <Button style={s.buttonAccent} href={invoiceUrl ?? 'https://mega-onboard.lovable.app/cliente/faturas'}>
            Ver comprovante
          </Button>
        </Section>
        <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: InvoicePaidEmail,
  subject: 'Pagamento confirmado — obrigado!',
  displayName: 'Pagamento confirmado',
  previewData: { name: 'Joana', amount: 'R$ 1.250,00', paidAt: '22/04/2026', method: 'Pix', invoiceUrl: 'https://mega-onboard.lovable.app/cliente/faturas' },
} satisfies TemplateEntry
