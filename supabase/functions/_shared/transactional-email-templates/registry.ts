/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcomeClient } from './welcome-client.tsx'
import { template as invoiceCreated } from './invoice-created.tsx'
import { template as invoiceReminder } from './invoice-reminder.tsx'
import { template as invoicePaid } from './invoice-paid.tsx'
import { template as proposalAccepted } from './proposal-accepted.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome-client': welcomeClient,
  'invoice-created': invoiceCreated,
  'invoice-reminder': invoiceReminder,
  'invoice-paid': invoicePaid,
  'proposal-accepted': proposalAccepted,
}
