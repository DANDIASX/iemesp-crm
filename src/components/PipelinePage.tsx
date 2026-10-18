import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { daysSince, funilGrupoFor } from '../lib/whatsapp'
import KanbanColumn from './KanbanColumn'
import type { Curso, Lead, PipelineStage } from '../types'

const STAGES: { key: PipelineStage; label: string; badgeClass: string }[] = [
  { key: 'novo', label: 'Novo', badgeClass: 'bg-blue-100 text-blue-800' },
  { key: 'contatado', label: 'Contatado', badgeClass: 'bg-amber-100 text-amber-800' },
  { key: 'negociando', label: 'Negociando', badgeClass: 'bg-purple-100 text-purple-800' },
  { key: 'aguardando_pagamento', label: 'Aguardando pagamento', badgeClass: 'bg-orange-100 text-orange-800' },
  { key: 'matriculado', label: 'Matriculado', badgeClass: 'bg-emerald-100 text-emerald-800' },
  { key: 'perdido', label: 'Perdido', badgeClass: 'bg-red-100 text-red-800' },
]

const SECOES: { grupo: 'topo' | 'fundo' | 'perdido'; titulo: string; corTitulo: string }[] = [
  { grupo: 'topo', titulo: 'Topo de funil', corTitulo: 'text-blue-800' },
  { grupo: 'fundo', titulo: 'Fundo de funil', corTitulo: 'text-emerald-800' },
  { grupo: 'perdido', titulo: 'Perdido', corTitulo: 'text-red-800' },
]

const STALE_CONTACT_STAGES: PipelineStage[] = ['novo', 'contatado', 'negociando']
const STALE_CONTACT_DAYS = 3
const STALE_PAYMENT_DAYS = 2

type GrupoCurso = 'presencial' | 'outros'

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [presencialLeadIds, setPresencialLeadIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [grupoCurso, setGrupoCurso] = useState<GrupoCurso>('presencial')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [leadsRes, cursosRes, pedidosRes] = await Promise.all([
      supabase.from('leads').select('*').order('stage_updated_at', { ascending: false }),
      supabase.from('cursos').select('*').eq('ativo', true).order('titulo'),
      supabase.from('pedidos').select('lead_id, cursos!inner(modalidade)').eq('cursos.modalidade', 'presencial'),
    ])

    if (leadsRes.error) setMessage(`Erro ao carregar leads: ${leadsRes.error.message}`)
    setLeads((leadsRes.data as Lead[]) || [])
    setCursos((cursosRes.data as Curso[]) || [])

    const ids = new Set<string>()
    for (const p of (pedidosRes.data as { lead_id: string | null }[]) || []) {
      if (p.lead_id) ids.add(p.lead_id)
    }
    setPresencialLeadIds(ids)

    setLoading(false)
  }

  const isPresencial = (lead: Lead) =>
    lead.produto_interesse === 'curso_pratico' ||
    lead.produto_interesse === 'ambos' ||
    presencialLeadIds.has(lead.id)

  const onMoveStage = async (lead: Lead, newStage: PipelineStage) => {
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

    await load()
    setUpdatingId(null)
  }

  const onMarkPaid = async (lead: Lead, payment: { valor_curso: number | null; forma_pagamento: string | null }) => {
    setUpdatingId(lead.id)
    const { error } = await supabase
      .from('leads')
      .update({ ...payment, pago: true, data_pagamento: new Date().toISOString() })
      .eq('id', lead.id)

    if (error) setMessage(`Erro ao marcar pagamento: ${error.message}`)
    await load()
    setUpdatingId(null)
  }

  const onDelete = async (lead: Lead) => {
    setUpdatingId(lead.id)
    const { error } = await supabase.from('leads').delete().eq('id', lead.id)
    if (error) setMessage(`Erro ao excluir: ${error.message}`)
    await load()
    setUpdatingId(null)
  }

  const leadsDoGrupo = leads.filter(l => (grupoCurso === 'presencial' ? isPresencial(l) : !isPresencial(l)))

  const staleContact = leadsDoGrupo.filter(
    l => STALE_CONTACT_STAGES.includes(l.pipeline_stage) && daysSince(l.stage_updated_at) >= STALE_CONTACT_DAYS
  )
  const stalePayment = leadsDoGrupo.filter(
    l => l.pipeline_stage === 'aguardando_pagamento' && daysSince(l.stage_updated_at) >= STALE_PAYMENT_DAYS
  )

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Leads</h1>
      <p className="mt-2 text-slate-600">Acompanhe cada contato desde o primeiro interesse até a matrícula.</p>

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setGrupoCurso('presencial')}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            grupoCurso === 'presencial' ? 'bg-iemesp-900 text-white' : 'bg-white text-iemesp-900 hover:bg-iemesp-900/10'
          }`}
        >
          Curso Presencial ({leads.filter(isPresencial).length})
        </button>
        <button
          onClick={() => setGrupoCurso('outros')}
          className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            grupoCurso === 'outros' ? 'bg-iemesp-900 text-white' : 'bg-white text-iemesp-900 hover:bg-iemesp-900/10'
          }`}
        >
          Outros / Plataforma ({leads.filter(l => !isPresencial(l)).length})
        </button>
      </div>

      {(staleContact.length > 0 || stalePayment.length > 0) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
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

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}

      {loading ? (
        <p className="mt-6 text-slate-500">Carregando...</p>
      ) : (
        <div className="mt-6 space-y-6">
          {SECOES.map(secao => {
            const stagesDaSecao = STAGES.filter(s => funilGrupoFor(s.key) === secao.grupo)
            const totalNaSecao = leadsDoGrupo.filter(l => funilGrupoFor(l.pipeline_stage) === secao.grupo).length
            return (
              <div key={secao.grupo}>
                <h2 className={`mb-2 text-sm font-bold uppercase tracking-wide ${secao.corTitulo}`}>
                  {secao.titulo} ({totalNaSecao})
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {stagesDaSecao.map(stage => (
                    <KanbanColumn
                      key={stage.key}
                      label={stage.label}
                      badgeClass={stage.badgeClass}
                      leads={leadsDoGrupo.filter(l => l.pipeline_stage === stage.key)}
                      cursos={cursos}
                      updatingId={updatingId}
                      onMoveStage={onMoveStage}
                      onMarkPaid={onMarkPaid}
                      onDelete={onDelete}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
