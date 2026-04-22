/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import * as s from './_styles.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  portalUrl?: string
}

const ProposalAcceptedEmail = ({ name, portalUrl = 'https://mega-onboard.lovable.app/cliente' }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Recebemos seu aceite — próximos passos</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
        <Heading style={s.h1}>Proposta aceita ✓</Heading>
        <Text style={s.text}>
          {name ? `${name}, ` : ''}recebemos seu aceite e iniciamos a configuração do seu contrato.
          Em breve nossa equipe entrará em contato para o kickoff.
        </Text>
        <Text style={s.text}>
          Enquanto isso, você já pode acessar sua área do cliente para acompanhar
          o status do contrato e visualizar suas próximas faturas.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <Button style={s.button} href={portalUrl}>Acessar área do cliente</Button>
        </Section>
        <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ProposalAcceptedEmail,
  subject: 'Recebemos seu aceite — bem-vindo à Prospekta',
  displayName: 'Aceite de proposta',
  previewData: { name: 'Joana', portalUrl: 'https://mega-onboard.lovable.app/cliente' },
} satisfies TemplateEntry
