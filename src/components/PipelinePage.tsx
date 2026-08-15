import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead, PipelineStage, ProdutoInteresse } from '../types'

const STAGES: { key: PipelineStage; label: string; badgeClass: string }[] = [
  { key: 'novo', label: 'Novo', badgeClass: 'bg-blue-100 text-blue-800' },
  { key: 'contatado', label: 'Contatado', badgeClass: 'bg-amber-100 text-amber-800' },
  { key: 'matriculado', label: 'Matriculado', badgeClass: 'bg-emerald-100 text-emerald-800' },
  { key: 'perdido', label: 'Perdido', badgeClass: 'bg-red-100 text-red-800' },
]

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

  const leadsInTab = leads.filter(l => l.pipeline_stage === activeTab)

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Leads</h1>
      <p className="mt-2 text-slate-600">Acompanhe cada contato desde o primeiro interesse até a matrícula.</p>

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
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  STAGES.find(s => s.key === lead.pipeline_stage)?.badgeClass
                }`}
              >
                {STAGES.find(s => s.key === lead.pipeline_stage)?.label}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
                    onClick={() => moveStage(lead, 'matriculado')}
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
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
          </div>
        ))}
      </div>
    </div>
  )
}
