import type { Lead, PipelineStage } from '../types'

const MESSAGE_TEMPLATES: Partial<Record<PipelineStage, string>> = {
  novo: 'Olá {{nome}}! Aqui é da IEMESP. Recebemos seu interesse e posso te enviar mais detalhes sobre o curso/plataforma. Podemos conversar?',
  contatado: 'Oi {{nome}}, tudo bem? Ficou alguma dúvida sobre o curso? Estou à disposição para te ajudar.',
  negociando: 'Olá {{nome}}, conseguiu ver a proposta com calma? Posso te ajudar a garantir sua vaga hoje.',
  aguardando_pagamento: 'Oi {{nome}}, só confirmando: conseguiu fazer o pagamento? Assim que confirmar, já garanto sua vaga.',
}

export function messageTemplateFor(stage: PipelineStage): string | null {
  return MESSAGE_TEMPLATES[stage] ?? null
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
