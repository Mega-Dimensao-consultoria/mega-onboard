/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import * as s from './_styles.ts'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
  contractsCount?: number
  invoicesCount?: number
}

const ClientDeletedEmail = ({ name, contractsCount = 0, invoicesCount = 0 }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Sua conta foi encerrada</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
        <Heading style={s.h1}>{name ? `${name}, sua conta foi encerrada` : 'Sua conta foi encerrada'}</Heading>
        <Text style={s.text}>
          Confirmamos o encerramento da sua conta na Prospekta. Todos os dados
          relacionados foram removidos do nosso sistema, incluindo:
        </Text>
        <Text style={s.text}>
          • {contractsCount} contrato(s)<br />
          • {invoicesCount} fatura(s)<br />
          • Perfil, acesso e itens vinculados
        </Text>
        <Text style={s.text}>
          Se isso não foi solicitado por você, responda imediatamente este email
          que entraremos em contato para apurar.
        </Text>
        <Text style={s.text}>
          Foi um prazer ter você como cliente. Se um dia quiser voltar, estaremos por aqui.
        </Text>
        <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ClientDeletedEmail,
  subject: 'Sua conta foi encerrada',
  displayName: 'Cliente excluído',
  previewData: { name: 'Joana', contractsCount: 1, invoicesCount: 4 },
} satisfies TemplateEntry
