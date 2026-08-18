import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { daysSince, fillTemplate, messageTemplateFor, whatsappLink } from '../lib/whatsapp'
import type { Lead, PipelineStage, ProdutoInteresse } from '../types'

const STAGES: { key: PipelineStage; label: string; badgeClass: string }[] = [
  { key: 'novo', label: 'Novo', badgeClass: 'bg-blue-100 text-blue-800' },
  { key: 'contatado', label: 'Contatado', badgeClass: 'bg-amber-100 text-amber-800' },
  { key: 'negociando', label: 'Negociando', badgeClass: 'bg-purple-100 text-purple-800' },
  { key: 'aguardando_pagamento', label: 'Aguardando pagamento', badgeClass: 'bg-orange-100 text-orange-800' },
  { key: 'matriculado', label: 'Matriculado', badgeClass: 'bg-emerald-100 text-emerald-800' },
  { key: 'perdido', label: 'Perdido', badgeClass: 'bg-red-100 text-red-800' },
]

const STALE_CONTACT_STAGES: PipelineStage[] = ['novo', 'contatado', 'negociando']
const STALE_CONTACT_DAYS = 3
const STALE_PAYMENT_DAYS = 2

const PRODUTO_LABEL: Record<ProdutoInteresse, string> = {
  curso_pratico: 'Curso Procedimentos 2.0',
  plataforma: 'Plataforma',
  ambos: 'Curso + Plataforma',
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PipelineStage>('novo')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState('PIX')

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('stage_updated_at', { ascending: false })

    if (error) {
      setMessage(`Erro ao carregar leads: ${error.message}`)
    } else {
      setLeads((data as Lead[]) || [])
    }
    setLoading(false)
  }

  const moveStage = async (lead: Lead, newStage: PipelineStage) => {
    setUpdatingId(lead.id)
    setMessage('')

    const { error } = await supabase
      .from('leads')
      .update({ pipeline_stage: newStage, stage_updated_at: new Date().toISOString() })
      .eq('id', lead.id)

    if (error) {
      setMessage(`Erro ao mover: ${error.message}`)
      setUpdatingId(null)
      return
    }

    if (newStage === 'matriculado') {
      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('lead_id', lead.id)
        .maybeSingle()

      if (!existing) {
        await supabase.from('students').insert([
          { lead_id: lead.id, nome: lead.nome, email: lead.email, telefone: lead.telefone },
        ])
      }
    }

    await fetchLeads()
    setUpdatingId(null)
  }

  const openPaymentForm = (lead: Lead) => {
    setPayingId(lead.id)
    setValor(lead.valor_curso?.toString() ?? '')
    setForma(lead.forma_pagamento ?? 'PIX')
  }

  const markPaid = async (lead: Lead) => {
    setUpdatingId(lead.id)
    const { error } = await supabase
      .from('leads')
      .update({
        pago: true,
        valor_curso: valor ? Number(valor) : null,
        forma_pagamento: forma || null,
        data_pagamento: new Date().toISOString(),
      })
      .eq('id', lead.id)

    if (error) setMessage(`Erro ao marcar pagamento: ${error.message}`)
    setPayingId(null)
    await fetchLeads()
    setUpdatingId(null)
  }

  const copyMessage = async (lead: Lead) => {
    const template = messageTemplateFor(lead.pipeline_stage)
    if (!template) return
    await navigator.clipboard.writeText(fillTemplate(template, lead))
  }

  const leadsInTab = leads.filter(l => l.pipeline_stage === activeTab)

  const staleContact = leads.filter(
    l => STALE_CONTACT_STAGES.includes(l.pipeline_stage) && daysSince(l.stage_updated_at) >= STALE_CONTACT_DAYS
  )
  const stalePayment = leads.filter(
    l => l.pipeline_stage === 'aguardando_pagamento' && daysSince(l.stage_updated_at) >= STALE_PAYMENT_DAYS
  )

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Leads</h1>
      <p className="mt-2 text-slate-600">Acompanhe cada contato desde o primeiro interesse até a matrícula.</p>

      {(staleContact.length > 0 || stalePayment.length > 0) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {staleContact.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">
                Sem contato há {STALE_CONTACT_DAYS}+ dias ({staleContact.length})
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-amber-700">
                {staleContact.map(l => (
                  <li key={l.id}>{l.nome} — {daysSince(l.stage_updated_at)} dias</li>
                ))}
              </ul>
            </div>
          )}
          {stalePayment.length > 0 && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-orange-800">
                Aguardando pagamento há {STALE_PAYMENT_DAYS}+ dias ({stalePayment.length})
              </p>
              <ul className="mt-1 space-y-0.5 text-sm text-orange-700">
                {stalePayment.map(l => (
                  <li key={l.id}>{l.nome} — {daysSince(l.stage_updated_at)} dias</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {STAGES.map(stage => {
          const count = leads.filter(l => l.pipeline_stage === stage.key).length
          const isActive = activeTab === stage.key
          return (
            <button
              key={stage.key}
              onClick={() => setActiveTab(stage.key)}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                isActive ? 'bg-iemesp-900 text-white' : 'bg-white text-iemesp-900 hover:bg-iemesp-900/10'
              }`}
            >
              {stage.label} ({count})
            </button>
          )
        })}
      </div>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}

      <div className="mt-6 space-y-4">
        {loading && <p className="text-slate-500">Carregando...</p>}

        {!loading && leadsInTab.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhum lead nesse status por enquanto.
          </div>
        )}

        {leadsInTab.map(lead => (
          <div key={lead.id} className="rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-iemesp-900">{lead.nome}</p>
                <p className="text-sm text-slate-600">{lead.telefone}</p>
                {lead.produto_interesse && (
                  <p className="mt-1 text-sm text-slate-500">Interesse: {PRODUTO_LABEL[lead.produto_interesse]}</p>
                )}
                {lead.utm_source && (
                  <p className="mt-0.5 text-xs text-slate-400">
                    Origem: {lead.utm_source}{lead.utm_campaign ? ` · ${lead.utm_campaign}` : ''}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">Há {daysSince(lead.stage_updated_at)} dias nesta fase</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    STAGES.find(s => s.key === lead.pipeline_stage)?.badgeClass
                  }`}
                >
                  {STAGES.find(s => s.key === lead.pipeline_stage)?.label}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    lead.pago ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {lead.pago ? 'Pago' : 'Não pago'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {messageTemplateFor(lead.pipeline_stage) && (
                <>
                  <a
                    href={whatsappLink(lead.telefone, fillTemplate(messageTemplateFor(lead.pipeline_stage)!, lead))}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    WhatsApp
                  </a>
                  <button
                    onClick={() => copyMessage(lead)}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                  >
                    Copiar mensagem
                  </button>
                </>
              )}

              {lead.pipeline_stage === 'novo' && (
                <>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'contatado')}
                    className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                  >
                    Marcar como Contatado
                  </button>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'perdido')}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    Marcar como Perdido
                  </button>
                </>
              )}

              {lead.pipeline_stage === 'contatado' && (
                <>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'negociando')}
                    className="rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                  >
                    Marcar como Negociando
                  </button>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'perdido')}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    Marcar como Perdido
                  </button>
                </>
              )}

              {lead.pipeline_stage === 'negociando' && (
                <>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'aguardando_pagamento')}
                    className="rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                  >
                    Marcar como Aguardando pagamento
                  </button>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'perdido')}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    Marcar como Perdido
                  </button>
                </>
              )}

              {lead.pipeline_stage === 'aguardando_pagamento' && (
                <>
                  {!lead.pago && (
                    <button
                      disabled={updatingId === lead.id}
                      onClick={() => openPaymentForm(lead)}
                      className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Marcar como pago
                    </button>
                  )}
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'matriculado')}
                    className="rounded-full bg-iemesp-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-60"
                  >
                    Marcar como Matriculado
                  </button>
                  <button
                    disabled={updatingId === lead.id}
                    onClick={() => moveStage(lead, 'perdido')}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    Marcar como Perdido
                  </button>
                </>
              )}

              {lead.pipeline_stage === 'matriculado' && (
                <p className="text-sm text-emerald-700">Aluno matriculado — veja em "Alunos".</p>
              )}

              {lead.pipeline_stage === 'perdido' && (
                <button
                  disabled={updatingId === lead.id}
                  onClick={() => moveStage(lead, 'novo')}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                >
                  Reabrir como Novo
                </button>
              )}
            </div>

            {payingId === lead.id && (
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-slate-50 p-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500">Valor pago (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={e => setValor(e.target.value)}
                    className="mt-1 w-32 rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500">Forma de pagamento</label>
                  <input
                    value={forma}
                    onChange={e => setForma(e.target.value)}
                    className="mt-1 w-40 rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <button
                  disabled={updatingId === lead.id}
                  onClick={() => markPaid(lead)}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  Confirmar pagamento
                </button>
                <button
                  onClick={() => setPayingId(null)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
