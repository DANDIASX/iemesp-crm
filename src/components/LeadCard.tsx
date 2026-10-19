import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { daysSince, fillTemplate, messageTemplateFor, whatsappLink, type Canal } from '../lib/whatsapp'
import { centavosToBRL } from '../lib/currency'
import type { Curso, Lead, PedidoComRelacoes, PipelineStage, ProdutoInteresse } from '../types'

const PRODUTO_LABEL: Record<ProdutoInteresse, string> = {
  curso_pratico: 'Curso Procedimentos 2.0',
  plataforma: 'Plataforma',
  ambos: 'Curso + Plataforma',
}

const PEDIDO_STATUS_LABEL: Record<PedidoComRelacoes['status'], string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
  excedente: 'Excedente (turma lotou)',
}

const PEDIDO_STATUS_BADGE: Record<PedidoComRelacoes['status'], string> = {
  pendente: 'bg-slate-100 text-slate-600',
  aprovado: 'bg-emerald-100 text-emerald-800',
  recusado: 'bg-red-100 text-red-800',
  cancelado: 'bg-slate-100 text-slate-600',
  reembolsado: 'bg-purple-100 text-purple-800',
  excedente: 'bg-red-100 text-red-800',
}

const SITE_URL = 'https://formulario.iemesp.com.br'

type Props = {
  lead: Lead
  cursos: Curso[]
  updating: boolean
  onMoveStage: (lead: Lead, stage: PipelineStage) => void
  onMarkPaid: (lead: Lead, payment: { valor_curso: number | null; forma_pagamento: string | null }) => void
  onDelete: (lead: Lead) => void
}

export default function LeadCard({ lead, cursos, updating, onMoveStage, onMarkPaid, onDelete }: Props) {
  const [canal, setCanal] = useState<Canal>('whatsapp')
  const [showPedidos, setShowPedidos] = useState(false)
  const [pedidos, setPedidos] = useState<PedidoComRelacoes[] | null>(null)
  const [loadingPedidos, setLoadingPedidos] = useState(false)

  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [linkCursoSlug, setLinkCursoSlug] = useState(cursos[0]?.slug ?? '')
  const [linkCupomCodigo, setLinkCupomCodigo] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [valor, setValor] = useState(lead.valor_curso?.toString() ?? '')
  const [forma, setForma] = useState(lead.forma_pagamento ?? 'PIX')

  const [confirmDelete, setConfirmDelete] = useState(false)

  const togglePedidos = async () => {
    setShowPedidos(v => !v)
    if (pedidos !== null) return
    setLoadingPedidos(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, cursos(titulo), cupons(codigo)')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false })
    setPedidos((data as PedidoComRelacoes[]) || [])
    setLoadingPedidos(false)
  }

  const copyCheckoutLink = async () => {
    if (!linkCursoSlug) return
    const url = new URL(`${SITE_URL}/checkout/${linkCursoSlug}`)
    if (linkCupomCodigo.trim()) url.searchParams.set('cupom', linkCupomCodigo.trim())
    await navigator.clipboard.writeText(url.toString())
    setLinkCopied(true)
  }

  const copyMessage = async () => {
    const template = messageTemplateFor(lead.pipeline_stage, canal)
    if (!template) return
    await navigator.clipboard.writeText(fillTemplate(template, lead))
  }

  const template = messageTemplateFor(lead.pipeline_stage, canal)
  const mensagemPronta = template ? fillTemplate(template, lead) : null

  return (
    <div className="rounded-xl bg-white p-3 shadow text-sm space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-iemesp-900">{lead.nome}</p>
          <p className="text-slate-500">{lead.telefone}</p>
          {lead.produto_interesse && (
            <p className="mt-0.5 text-xs text-slate-500">{PRODUTO_LABEL[lead.produto_interesse]}</p>
          )}
          {lead.utm_source && (
            <p className="mt-0.5 text-xs text-slate-400">
              {lead.utm_source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${lead.pago ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
          {lead.pago ? 'Pago' : 'Não pago'}
        </span>
      </div>

      <p className="text-xs text-slate-400">Há {daysSince(lead.stage_updated_at)} dias nesta fase</p>

      <select
        className="w-full rounded border-gray-300 p-1.5 text-xs"
        value={lead.pipeline_stage}
        onChange={e => onMoveStage(lead, e.target.value as PipelineStage)}
        disabled={updating}
      >
        <option value="novo">Novo</option>
        <option value="contatado">Contatado</option>
        <option value="negociando">Negociando</option>
        <option value="aguardando_pagamento">Aguardando pagamento</option>
        <option value="matriculado">Matriculado</option>
        <option value="perdido">Perdido</option>
      </select>

      {template && (
        <div className="rounded-lg bg-slate-50 p-2 space-y-1.5">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setCanal('whatsapp')}
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${canal === 'whatsapp' ? 'bg-[#25D366] text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setCanal('instagram')}
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${canal === 'instagram' ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              Instagram
            </button>
          </div>
          {canal === 'instagram' && lead.instagram && (
            <p className="text-xs font-semibold text-purple-700">{lead.instagram}</p>
          )}
          {canal === 'instagram' && !lead.instagram && (
            <p className="text-xs text-amber-600">Lead não informou o Instagram.</p>
          )}
          <p className="text-xs text-slate-600 whitespace-pre-wrap">{mensagemPronta}</p>
          <div className="flex flex-wrap gap-1.5">
            {canal === 'whatsapp' && (
              <a
                href={whatsappLink(lead.telefone, mensagemPronta!)}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90"
              >
                Abrir WhatsApp
              </a>
            )}
            <button
              type="button"
              onClick={copyMessage}
              className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Copiar mensagem
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={togglePedidos}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          {showPedidos ? 'Ocultar pedidos' : 'Pedidos'}
        </button>
        <button
          type="button"
          onClick={() => setShowLinkPicker(v => !v)}
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
        >
          Link de checkout
        </button>
        {!lead.pago && (
          <button
            type="button"
            onClick={() => setShowPaymentForm(v => !v)}
            className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
          >
            Marcar pago
          </button>
        )}
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
          >
            Excluir
          </button>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs text-red-700">
            Excluir de vez?
            <button type="button" onClick={() => onDelete(lead)} className="font-semibold underline">Sim</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="underline">Não</button>
          </span>
        )}
      </div>

      {showPaymentForm && (
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2">
          <div>
            <label className="block text-xs text-slate-500">Valor pago (R$)</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500">Forma de pagamento</label>
            <input
              value={forma}
              onChange={e => setForma(e.target.value)}
              className="mt-0.5 w-full rounded border border-slate-300 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => { onMarkPaid(lead, { valor_curso: valor ? Number(valor) : null, forma_pagamento: forma || null }); setShowPaymentForm(false) }}
              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
            >
              Confirmar
            </button>
            <button type="button" onClick={() => setShowPaymentForm(false)} className="rounded-full px-3 py-1 text-xs text-slate-500 underline">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showLinkPicker && (
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2">
          <select
            value={linkCursoSlug}
            onChange={e => setLinkCursoSlug(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
          >
            {cursos.length === 0 && <option value="">Nenhum curso ativo</option>}
            {cursos.map(c => (
              <option key={c.id} value={c.slug}>{c.titulo}</option>
            ))}
          </select>
          <input
            value={linkCupomCodigo}
            onChange={e => setLinkCupomCodigo(e.target.value)}
            placeholder="Cupom (opcional)"
            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={!linkCursoSlug}
            onClick={copyCheckoutLink}
            className="rounded-full bg-iemesp-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
          >
            {linkCopied ? 'Copiado!' : 'Copiar link'}
          </button>
        </div>
      )}

      {showPedidos && (
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2">
          {loadingPedidos && <p className="text-xs text-slate-500">Carregando...</p>}
          {pedidos?.length === 0 && <p className="text-xs text-slate-500">Nenhum pedido ainda.</p>}
          {pedidos?.map(pedido => (
            <div key={pedido.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-xs">
              <div>
                <p className="font-medium text-iemesp-900">{pedido.cursos?.titulo ?? 'Curso removido'}</p>
                <p className="text-slate-500">
                  {pedido.cupons?.codigo ? `${pedido.cupons.codigo} · ` : ''}
                  {centavosToBRL(pedido.valor_final_centavos)}
                </p>
              </div>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${PEDIDO_STATUS_BADGE[pedido.status]}`}>
                {PEDIDO_STATUS_LABEL[pedido.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
