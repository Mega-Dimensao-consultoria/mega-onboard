/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBar}>
          <Text style={brandText}>Prospekta</Text>
        </Section>
        <Heading style={h1}>Confirme sua identidade</Heading>
        <Text style={text}>Use o código abaixo para confirmar sua identidade:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={footer}>
          Este código expira em alguns minutos. Se você não solicitou esta ação, ignore este email com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif", margin: 0, padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '0 24px' }
const brandBar = { borderBottom: '2px solid hsl(222, 60%, 18%)', paddingBottom: '12px', marginBottom: '28px' }
const brandText = { fontFamily: "'Fraunces', Georgia, serif", fontSize: '20px', fontWeight: 700 as const, color: 'hsl(222, 60%, 18%)', margin: 0 }
const h1 = { fontFamily: "'Fraunces', Georgia, serif", fontSize: '26px', fontWeight: 600 as const, color: 'hsl(222, 45%, 11%)', margin: '0 0 18px' }
const text = { fontSize: '15px', color: 'hsl(215, 16%, 32%)', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '32px', fontWeight: 700 as const, color: 'hsl(222, 60%, 18%)', letterSpacing: '0.2em', textAlign: 'center' as const, background: 'hsl(215, 35%, 96%)', padding: '20px', borderRadius: '12px', margin: '0 0 24px' }
const footer = { fontSize: '12px', color: 'hsl(215, 16%, 50%)', margin: '36px 0 0', borderTop: '1px solid hsl(215, 25%, 90%)', paddingTop: '16px' }
