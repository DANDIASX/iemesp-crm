import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Lead } from '../types'

type Periodo = 7 | 30 | 90

const PERIODO_LABEL: Record<Periodo, string> = {
  7: 'Últimos 7 dias',
  30: 'Últimos 30 dias',
  90: 'Últimos 90 dias',
}

type LinhaCanal = {
  canal: string
  leads: number
  qualificados: number
  alunos: number
}

export default function PainelPage() {
  const [periodo, setPeriodo] = useState<Periodo>(7)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const carregar = async () => {
      setLoading(true)
      const desde = new Date()
      desde.setDate(desde.getDate() - periodo)

      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .gte('created_at', desde.toISOString())

      if (error) setMessage(`Erro ao carregar leads: ${error.message}`)
      else setMessage('')
      setLeads((data as Lead[]) || [])
      setLoading(false)
    }
    carregar()
  }, [periodo])

  const porCanal = new Map<string, LinhaCanal>()
  for (const lead of leads) {
    const canal = lead.utm_source?.trim() || 'Direto / sem origem'
    if (!porCanal.has(canal)) porCanal.set(canal, { canal, leads: 0, qualificados: 0, alunos: 0 })
    const linha = porCanal.get(canal)!
    linha.leads += 1
    if (lead.pipeline_stage !== 'novo') linha.qualificados += 1
    if (lead.pago) linha.alunos += 1
  }
  const linhas = Array.from(porCanal.values()).sort((a, b) => b.leads - a.leads)

  const totalLeads = leads.length
  const totalQualificados = leads.filter(l => l.pipeline_stage !== 'novo').length
  const totalAlunos = leads.filter(l => l.pago).length

  const pct = (parte: number, total: number) => (total === 0 ? '—' : `${Math.round((parte / total) * 100)}%`)

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Painel semanal</h1>
      <p className="mt-2 text-slate-600">Leads, qualificação e matrícula por canal — ainda sem custo por lead, já que nenhuma campanha paga está rodando.</p>

      <div className="mt-6 flex gap-2">
        {([7, 30, 90] as Periodo[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              periodo === p ? 'bg-iemesp-900 text-white' : 'bg-white text-iemesp-900 hover:bg-iemesp-900/10'
            }`}
          >
            {PERIODO_LABEL[p]}
          </button>
        ))}
      </div>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      {loading && <p className="mt-6 text-slate-500">Carregando...</p>}

      {!loading && (
        <>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Leads</p>
              <p className="mt-1 text-3xl font-bold text-iemesp-900">{totalLeads}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">% qualificados</p>
              <p className="mt-1 text-3xl font-bold text-iemesp-900">{pct(totalQualificados, totalLeads)}</p>
              <p className="text-xs text-slate-400">{totalQualificados} de {totalLeads}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">% viraram aluno</p>
              <p className="mt-1 text-3xl font-bold text-iemesp-900">{pct(totalAlunos, totalLeads)}</p>
              <p className="text-xs text-slate-400">{totalAlunos} de {totalLeads}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl bg-white p-5 shadow">
            <h2 className="font-poppins font-semibold text-iemesp-900">Por canal (utm_source)</h2>
            {linhas.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Nenhum lead nesse período.</p>
            ) : (
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="pb-2 pr-3">Canal</th>
                    <th className="pb-2 pr-3">Leads</th>
                    <th className="pb-2 pr-3">Qualificados</th>
                    <th className="pb-2 pr-3">% qualificados</th>
                    <th className="pb-2 pr-3">Alunos</th>
                    <th className="pb-2 pr-3">% alunos</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(l => (
                    <tr key={l.canal} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-iemesp-900">{l.canal}</td>
                      <td className="py-2 pr-3">{l.leads}</td>
                      <td className="py-2 pr-3">{l.qualificados}</td>
                      <td className="py-2 pr-3">{pct(l.qualificados, l.leads)}</td>
                      <td className="py-2 pr-3">{l.alunos}</td>
                      <td className="py-2 pr-3">{pct(l.alunos, l.leads)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
