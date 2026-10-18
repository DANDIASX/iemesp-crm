import type { Lead, PipelineStage } from '../types'

export type Canal = 'whatsapp' | 'instagram'
export type FunilGrupo = 'topo' | 'fundo' | 'perdido'

export function funilGrupoFor(stage: PipelineStage): FunilGrupo {
  if (stage === 'perdido') return 'perdido'
  if (stage === 'novo' || stage === 'contatado') return 'topo'
  return 'fundo' // negociando, aguardando_pagamento, matriculado
}

const WHATSAPP_TEMPLATES: Partial<Record<PipelineStage, string>> = {
  novo: 'Olá {{nome}}! Aqui é da IEMESP. Recebemos seu interesse e posso te enviar mais detalhes sobre o curso/plataforma. Podemos conversar?',
  contatado: 'Oi {{nome}}, tudo bem? Ficou alguma dúvida sobre o curso? Estou à disposição para te ajudar.',
  negociando: 'Olá {{nome}}, conseguiu ver a proposta com calma? Posso te ajudar a garantir sua vaga hoje.',
  aguardando_pagamento: 'Oi {{nome}}, só confirmando: conseguiu fazer o pagamento? Assim que confirmar, já garanto sua vaga.',
}

// Mesmo texto-base do WhatsApp, em tom mais direto/casual pro Instagram —
// só copiar e colar na DM, sem integração automática.
const INSTAGRAM_TEMPLATES: Partial<Record<PipelineStage, string>> = {
  novo: 'Oi {{nome}}! 👋 Vi seu interesse aqui no Instagram. Posso te mandar mais detalhes sobre o curso por aqui mesmo?',
  contatado: 'Oi {{nome}}, tudo certo? Ficou alguma dúvida sobre o curso? Só chamar por aqui 😊',
  negociando: 'Oi {{nome}}! Conseguiu ver a proposta com calma? Posso te ajudar a garantir sua vaga.',
  aguardando_pagamento: 'Oi {{nome}}, passando pra saber se conseguiu fazer o pagamento — qualquer coisa me chama aqui!',
}

export function messageTemplateFor(stage: PipelineStage, canal: Canal = 'whatsapp'): string | null {
  const tabela = canal === 'whatsapp' ? WHATSAPP_TEMPLATES : INSTAGRAM_TEMPLATES
  return tabela[stage] ?? null
}

export function fillTemplate(template: string, lead: Lead): string {
  const primeiroNome = lead.nome.trim().split(/\s+/)[0] || lead.nome
  return template.replaceAll('{{nome}}', primeiroNome)
}

export function daysSince(isoDate: string): number {
  const then = new Date(isoDate).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

export function whatsappLink(telefone: string, message: string): string {
  const digits = telefone.replace(/\D/g, '')
  const withCountryCode = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(message)}`
}
