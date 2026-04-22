/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import * as s from './_styles.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  portalUrl?: string
}

const WelcomeClientEmail = ({ name, portalUrl = 'https://mega-onboard.lovable.app/cliente' }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Bem-vindo à Prospekta — sua área do cliente está pronta</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
        <Heading style={s.h1}>{name ? `Bem-vindo, ${name}!` : 'Bem-vindo à Prospekta!'}</Heading>
        <Text style={s.text}>
          Sua conta foi criada com sucesso. A partir de agora você pode acompanhar
          contratos, faturas, contratar serviços adicionais e gerenciar seu plano
          em um só lugar.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '0 0 28px' }}>
          <Button style={s.button} href={portalUrl}>Acessar minha área</Button>
        </Section>
        <Text style={s.text}>
          Qualquer dúvida, basta responder a este email — estamos por aqui.
        </Text>
        <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeClientEmail,
  subject: 'Bem-vindo à Prospekta',
  displayName: 'Boas-vindas ao cliente',
  previewData: { name: 'Joana', portalUrl: 'https://mega-onboard.lovable.app/cliente' },
} satisfies TemplateEntry
