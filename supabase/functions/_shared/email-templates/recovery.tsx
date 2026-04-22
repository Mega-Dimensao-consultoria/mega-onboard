/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefina sua senha da {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>{siteName}</Text>
        </Section>
        <Heading style={h1}>Redefinir senha</Heading>
        <Text style={text}>
          Recebemos um pedido para redefinir a senha da sua conta na{' '}
          {siteName}. Clique no botão abaixo para escolher uma nova senha. O
          link expira em alguns minutos.
        </Text>
        <Section style={{ textAlign: 'center' as const }}>
          <Button style={button} href={confirmationUrl}>
            Redefinir senha
          </Button>
        </Section>
        <Text style={footer}>
          Se você não solicitou a redefinição, ignore este email — sua senha
          atual continua valendo.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px' }
const brandBar = { borderBottom: '2px solid hsl(222, 60%, 18%)', paddingBottom: '12px', marginBottom: '28px' }
const brandText = { fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', fontWeight: 700 as const, color: 'hsl(222, 60%, 18%)', margin: 0 }
const h1 = { fontFamily: "'Fraunces', Georgia, serif", fontSize: '26px', fontWeight: 600 as const, color: 'hsl(222, 45%, 11%)', margin: '0 0 18px' }
const text = { fontSize: '15px', color: 'hsl(215, 16%, 32%)', lineHeight: '1.6', margin: '0 0 24px' }
const button = { backgroundColor: 'hsl(222, 60%, 18%)', color: '#ffffff', fontSize: '15px', fontWeight: 600 as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 50%)', margin: '36px 0 0', borderTop: '1px solid hsl(215, 25%, 90%)', paddingTop: '16px' }
