import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { centavosToBRL } from '../lib/currency'
import type { GastoMidia, Lead } from '../types'

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
  gastoCentavos: number
}

const hojeISO = () => new Date().toISOString().slice(0, 10)

export default function PainelPage() {
  const [periodo, setPeriodo] = useState<Periodo>(7)
  const [leads, setLeads] = useState<Lead[]>([])
  const [gastos, setGastos] = useState<GastoMidia[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [formData, setFormData] = useState(hojeISO())
  const [formCanal, setFormCanal] = useState('meta')
  const [formCampanha, setFormCampanha] = useState('')
  const [formValor, setFormValor] = useState('')
  const [salvando, setSalvando] = useState(false)

  const carregar = async () => {
    setLoading(true)
    const desde = new Date()
    desde.setDate(desde.getDate() - periodo)
    const desdeData = desde.toISOString().slice(0, 10)

    const [leadsRes, gastosRes] = await Promise.all([
      supabase.from('leads').select('*').gte('created_at', desde.toISOString()),
      supabase.from('gastos_midia').select('*').gte('data', desdeData).order('data', { ascending: false }),
    ])

    if (leadsRes.error) setMessage(`Erro ao carregar leads: ${leadsRes.error.message}`)
    else if (gastosRes.error) setMessage(`Erro ao carregar gastos: ${gastosRes.error.message}`)
    else setMessage('')

    setLeads((leadsRes.data as Lead[]) || [])
    setGastos((gastosRes.data as GastoMidia[]) || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [periodo])

  const registrarGasto = async (e: React.FormEvent) => {
    e.preventDefault()
    const valorNumero = Number(formValor.replace(',', '.'))
    if (!formCanal.trim() || !valorNumero || valorNumero <= 0) {
      setMessage('Informe o canal e um valor válido.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('gastos_midia').insert([{
      data: formData,
      canal: formCanal.trim().toLowerCase(),
      campanha: formCampanha.trim() || null,
      valor_centavos: Math.round(valorNumero * 100),
    }])
    setSalvando(false)
    if (error) {
      setMessage(`Erro ao registrar gasto: ${error.message}`)
      return
    }
    setFormValor('')
    setFormCampanha('')
    await carregar()
  }

  const excluirGasto = async (gasto: GastoMidia) => {
    if (!confirm(`Excluir o gasto de ${centavosToBRL(gasto.valor_centavos)} em ${gasto.data}?`)) return
    const { error } = await supabase.from('gastos_midia').delete().eq('id', gasto.id)
    if (error) setMessage(`Erro ao excluir: ${error.message}`)
    await carregar()
  }

  const porCanal = new Map<string, LinhaCanal>()
  for (const lead of leads) {
    const canal = lead.utm_source?.trim() || 'Direto / sem origem'
    if (!porCanal.has(canal)) porCanal.set(canal, { canal, leads: 0, qualificados: 0, alunos: 0, gastoCentavos: 0 })
    const linha = porCanal.get(canal)!
    linha.leads += 1
    if (lead.pipeline_stage !== 'novo') linha.qualificados += 1
    if (lead.pago) linha.alunos += 1
  }
  for (const gasto of gastos) {
    const canal = gasto.canal.trim()
    if (!porCanal.has(canal)) porCanal.set(canal, { canal, leads: 0, qualificados: 0, alunos: 0, gastoCentavos: 0 })
    porCanal.get(canal)!.gastoCentavos += gasto.valor_centavos
  }
  const linhas = Array.from(porCanal.values()).sort((a, b) => b.leads - a.leads)

  const totalLeads = leads.length
  const totalQualificados = leads.filter(l => l.pipeline_stage !== 'novo').length
  const totalAlunos = leads.filter(l => l.pago).length
  const totalGastoCentavos = gastos.reduce((soma, g) => soma + g.valor_centavos, 0)

  const pct = (parte: number, total: number) => (total === 0 ? '—' : `${Math.round((parte / total) * 100)}%`)
  const custoPor = (gastoCentavos: number, qtd: number) => (qtd === 0 || gastoCentavos === 0 ? '—' : centavosToBRL(gastoCentavos / qtd))

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Painel semanal</h1>
      <p className="mt-2 text-slate-600">Leads, qualificação, matrícula e custo por canal.</p>

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
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
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
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Gasto em mídia</p>
              <p className="mt-1 text-3xl font-bold text-iemesp-900">{centavosToBRL(totalGastoCentavos)}</p>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-2xl bg-white p-5 shadow">
            <h2 className="font-poppins font-semibold text-iemesp-900">Por canal</h2>
            {linhas.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">Nenhum lead ou gasto nesse período.</p>
            ) : (
              <table className="mt-4 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="pb-2 pr-3">Canal</th>
                    <th className="pb-2 pr-3">Leads</th>
                    <th className="pb-2 pr-3">% qualificados</th>
                    <th className="pb-2 pr-3">% alunos</th>
                    <th className="pb-2 pr-3">Gasto</th>
                    <th className="pb-2 pr-3">Custo/lead</th>
                    <th className="pb-2 pr-3">Custo/aluno</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map(l => (
                    <tr key={l.canal} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-iemesp-900">{l.canal}</td>
                      <td className="py-2 pr-3">{l.leads}</td>
                      <td className="py-2 pr-3">{pct(l.qualificados, l.leads)}</td>
                      <td className="py-2 pr-3">{pct(l.alunos, l.leads)}</td>
                      <td className="py-2 pr-3">{l.gastoCentavos > 0 ? centavosToBRL(l.gastoCentavos) : '—'}</td>
                      <td className="py-2 pr-3">{custoPor(l.gastoCentavos, l.leads)}</td>
                      <td className="py-2 pr-3">{custoPor(l.gastoCentavos, l.alunos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow">
            <h2 className="font-poppins font-semibold text-iemesp-900">Registrar gasto com mídia</h2>
            <form onSubmit={registrarGasto} className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500">Data</label>
                <input
                  type="date"
                  value={formData}
                  onChange={e => setFormData(e.target.value)}
                  className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Canal</label>
                <select
                  value={formCanal}
                  onChange={e => setFormCanal(e.target.value)}
                  className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="meta">meta</option>
                  <option value="google">google</option>
                  <option value="instagram">instagram</option>
                  <option value="whatsapp">whatsapp</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Campanha (opcional)</label>
                <input
                  value={formCampanha}
                  onChange={e => setFormCampanha(e.target.value)}
                  placeholder="proc2_jan27_leads"
                  className="mt-1 w-48 rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Valor (R$)</label>
                <input
                  value={formValor}
                  onChange={e => setFormValor(e.target.value)}
                  placeholder="30,00"
                  className="mt-1 w-28 rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={salvando}
                className="rounded-full bg-iemesp-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </form>

            {gastos.length > 0 && (
              <table className="mt-5 w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400">
                    <th className="pb-2 pr-3">Data</th>
                    <th className="pb-2 pr-3">Canal</th>
                    <th className="pb-2 pr-3">Campanha</th>
                    <th className="pb-2 pr-3">Valor</th>
                    <th className="pb-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map(g => (
                    <tr key={g.id} className="border-t border-slate-100">
                      <td className="py-2 pr-3">{new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="py-2 pr-3">{g.canal}</td>
                      <td className="py-2 pr-3 text-slate-500">{g.campanha ?? '-'}</td>
                      <td className="py-2 pr-3">{centavosToBRL(g.valor_centavos)}</td>
                      <td className="py-2 pr-3 text-right">
                        <button
                          onClick={() => excluirGasto(g)}
                          className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </td>
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
