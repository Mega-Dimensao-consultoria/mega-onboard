/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import * as s from './_styles.ts'
import type { TemplateEntry } from './registry.ts'

type Action = 'cancelled' | 'removed' | 'suspended' | 'reactivated' | 'added'

interface Props {
  name?: string
  serviceName?: string
  action?: Action
  byConsultant?: boolean
}

const labelByAction: Record<Action, { title: string; verb: string; preview: string }> = {
  cancelled: {
    title: 'Serviço cancelado',
    verb: 'foi cancelado',
    preview: 'Um serviço foi cancelado na sua conta',
  },
  removed: {
    title: 'Serviço removido',
    verb: 'foi removido do seu contrato',
    preview: 'Um serviço foi removido do seu contrato',
  },
  suspended: {
    title: 'Serviço suspenso',
    verb: 'foi suspenso temporariamente',
    preview: 'Um serviço foi suspenso na sua conta',
  },
  reactivated: {
    title: 'Serviço reativado',
    verb: 'foi reativado',
    preview: 'Um serviço foi reativado na sua conta',
  },
  added: {
    title: 'Serviço adicionado',
    verb: 'foi adicionado ao seu contrato',
    preview: 'Um novo serviço foi adicionado à sua conta',
  },
}

const ServiceChangedEmail = ({
  name,
  serviceName = 'Serviço',
  action = 'cancelled',
  byConsultant = false,
}: Props) => {
  const meta = labelByAction[action] || labelByAction.cancelled
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{meta.preview}</Preview>
      <Body style={s.main}>
        <Container style={s.container}>
          <Section style={s.brandBar}><Text style={s.brandText}>Prospekta</Text></Section>
          <Heading style={s.h1}>{meta.title}</Heading>
          <Text style={s.text}>
            {name ? `${name}, ` : ''}o serviço <strong>{serviceName}</strong> {meta.verb}.
          </Text>
          {byConsultant && (
            <Text style={s.text}>
              Esta alteração foi realizada pelo seu consultor. Caso tenha dúvidas,
              basta responder este email.
            </Text>
          )}
          {action === 'cancelled' || action === 'removed' || action === 'suspended' ? (
            <Text style={s.text}>
              Faturas já emitidas não são afetadas. As próximas cobranças não
              incluirão mais este serviço.
            </Text>
          ) : null}
          {action === 'added' || action === 'reactivated' ? (
            <Text style={s.text}>
              O serviço será incluído na sua próxima fatura conforme o ciclo
              contratado.
            </Text>
          ) : null}
          <Text style={s.footer}>Prospekta · Consultoria estratégica</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ServiceChangedEmail,
  subject: (data: Record<string, unknown>) => {
    const a = (data?.action as Action) || 'cancelled'
    const name = (data?.serviceName as string) || 'serviço'
    const map: Record<Action, string> = {
      cancelled: `Cancelamento de ${name}`,
      removed: `${name} removido do seu contrato`,
      suspended: `${name} foi suspenso`,
      reactivated: `${name} foi reativado`,
      added: `${name} foi adicionado ao seu contrato`,
    }
    return map[a] || map.cancelled
  },
  displayName: 'Alteração de serviço',
  previewData: { name: 'Joana', serviceName: 'Consultoria mensal', action: 'cancelled', byConsultant: false },
} satisfies TemplateEntry
