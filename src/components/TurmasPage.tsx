import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Pedido, PerfilPedido, Turma } from '../types'

const STATUS_LABEL: Record<Pedido['status'], string> = {
  aprovado: 'Pago',
  pendente: 'Pendente',
  recusado: 'Recusado',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado',
  excedente: 'Excedente',
}

const STATUS_COLOR: Record<Pedido['status'], string> = {
  aprovado: 'bg-emerald-100 text-emerald-800',
  pendente: 'bg-amber-100 text-amber-800',
  recusado: 'bg-slate-100 text-slate-600',
  cancelado: 'bg-slate-100 text-slate-600',
  reembolsado: 'bg-slate-100 text-slate-600',
  excedente: 'bg-red-100 text-red-800',
}

const PERFIL_LABEL: Record<PerfilPedido, string> = {
  medico: 'Médico',
  interno: 'Interno',
  estudante: 'Estudante',
}

const formatarData = (iso: string) => {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

const escapeCsv = (valor: string) => `"${valor.replace(/"/g, '""')}"`

const baixarCsv = (turma: Turma, pedidos: Pedido[]) => {
  const linhas = [
    ['Nome', 'E-mail', 'Telefone', 'Perfil', 'CRM/UF ou Faculdade', 'Status'].map(escapeCsv).join(','),
    ...pedidos.map(p => [
      p.nome,
      p.email,
      p.telefone,
      p.perfil ?? '',
      p.perfil === 'medico' ? `${p.crm_numero ?? ''}/${p.crm_uf ?? ''}` : (p.faculdade ?? ''),
      STATUS_LABEL[p.status],
    ].map(v => escapeCsv(String(v))).join(',')),
  ]
  const blob = new Blob([linhas.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `presenca-${turma.slug}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

type FormEdicao = {
  nome: string
  perfil: PerfilPedido | ''
  crm_numero: string
  crm_uf: string
  faculdade: string
}

const formVazio: FormEdicao = { nome: '', perfil: '', crm_numero: '', crm_uf: '', faculdade: '' }

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState<FormEdicao>(formVazio)
  const [salvando, setSalvando] = useState(false)

  const load = async () => {
    setLoading(true)
    const [turmasRes, pedidosRes] = await Promise.all([
      supabase.from('turmas').select('*').order('data_turma'),
      supabase.from('pedidos').select('*').not('turma_id', 'is', null).order('created_at'),
    ])
    if (turmasRes.error) setMessage(`Erro ao carregar turmas: ${turmasRes.error.message}`)
    if (pedidosRes.error) setMessage(`Erro ao carregar pedidos: ${pedidosRes.error.message}`)
    setTurmas((turmasRes.data as Turma[]) || [])
    setPedidos((pedidosRes.data as Pedido[]) || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const alternarConferido = async (pedido: Pedido) => {
    const { error } = await supabase.from('pedidos').update({ crm_conferido: !pedido.crm_conferido }).eq('id', pedido.id)
    if (error) {
      setMessage(`Erro ao atualizar: ${error.message}`)
      return
    }
    await load()
  }

  const iniciarEdicao = (pedido: Pedido) => {
    setEditandoId(pedido.id)
    setForm({
      nome: pedido.nome,
      perfil: pedido.perfil ?? '',
      crm_numero: pedido.crm_numero ?? '',
      crm_uf: pedido.crm_uf ?? '',
      faculdade: pedido.faculdade ?? '',
    })
    setMessage('')
  }

  const cancelarEdicao = () => {
    setEditandoId(null)
    setForm(formVazio)
  }

  const salvarEdicao = async (pedidoId: string) => {
    if (!form.nome.trim()) {
      setMessage('Informe um nome.')
      return
    }
    setSalvando(true)
    const { error } = await supabase.from('pedidos').update({
      nome: form.nome.trim(),
      perfil: form.perfil || null,
      crm_numero: form.perfil === 'medico' ? (form.crm_numero.trim() || null) : null,
      crm_uf: form.perfil === 'medico' ? (form.crm_uf.trim() || null) : null,
      faculdade: form.perfil !== 'medico' ? (form.faculdade.trim() || null) : null,
    }).eq('id', pedidoId)
    setSalvando(false)

    if (error) {
      setMessage(`Erro ao salvar: ${error.message}`)
      return
    }
    setEditandoId(null)
    setForm(formVazio)
    await load()
  }

  const excluirPedido = async (pedido: Pedido) => {
    if (!confirm(`Excluir o pedido de "${pedido.nome}"? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id)
    if (error) {
      setMessage(`Erro ao excluir: ${error.message}`)
      return
    }
    await load()
  }

  const pedidosDaTurma = (turmaId: string) => pedidos.filter(p => p.turma_id === turmaId)

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Turmas</h1>
      <p className="mt-2 text-slate-600">Vagas, pagamentos e conferência de CRM/matrícula por turma.</p>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}
      {loading && <p className="mt-6 text-slate-500">Carregando...</p>}

      {!loading && turmas.length === 0 && (
        <div className="mt-6 rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
          Nenhuma turma cadastrada ainda.
        </div>
      )}

      <div className="mt-6 space-y-6">
        {turmas.map(turma => {
          const pedidosTurma = pedidosDaTurma(turma.id)
          const aprovados = pedidosTurma.filter(p => p.status === 'aprovado')
          const pendentes = pedidosTurma.filter(p => p.status === 'pendente')
          const excedentes = pedidosTurma.filter(p => p.status === 'excedente')

          return (
            <div key={turma.id} className="rounded-2xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-iemesp-900">{turma.nome}</p>
                  <p className="text-sm text-slate-600">
                    {formatarData(turma.data_turma)}{turma.horario ? ` · ${turma.horario}` : ''}{turma.local ? ` · ${turma.local}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {aprovados.length} pago{aprovados.length === 1 ? '' : 's'} de {turma.vagas_total} vagas
                    {pendentes.length > 0 && ` · ${pendentes.length} pendente${pendentes.length === 1 ? '' : 's'}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{turma.status}</span>
                  <button
                    onClick={() => baixarCsv(turma, aprovados)}
                    disabled={aprovados.length === 0}
                    className="rounded-full bg-iemesp-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-40"
                  >
                    Exportar lista de presença
                  </button>
                </div>
              </div>

              {excedentes.length > 0 && (
                <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  ⚠ {excedentes.length} pedido{excedentes.length === 1 ? '' : 's'} pago{excedentes.length === 1 ? '' : 's'} além
                  das vagas disponíveis — entre em contato pra reembolsar ou reencaixar: {excedentes.map(p => p.nome).join(', ')}.
                </div>
              )}

              {pedidosTurma.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">Nenhum pedido ainda.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400">
                        <th className="pb-2 pr-3">Nome</th>
                        <th className="pb-2 pr-3">Perfil</th>
                        <th className="pb-2 pr-3">CRM/UF ou Faculdade</th>
                        <th className="pb-2 pr-3">Status</th>
                        <th className="pb-2 pr-3">CRM conferido</th>
                        <th className="pb-2 pr-3">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosTurma.map(p => {
                        const emEdicao = editandoId === p.id
                        return (
                          <tr key={p.id} className="border-t border-slate-100 align-top">
                            {emEdicao ? (
                              <>
                                <td className="py-2 pr-3">
                                  <input
                                    value={form.nome}
                                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                                    className="w-36 rounded border border-slate-300 px-2 py-1"
                                  />
                                </td>
                                <td className="py-2 pr-3">
                                  <select
                                    value={form.perfil}
                                    onChange={e => setForm(f => ({ ...f, perfil: e.target.value as PerfilPedido | '' }))}
                                    className="rounded border border-slate-300 px-2 py-1"
                                  >
                                    <option value="">-</option>
                                    <option value="medico">Médico</option>
                                    <option value="interno">Interno</option>
                                    <option value="estudante">Estudante</option>
                                  </select>
                                </td>
                                <td className="py-2 pr-3">
                                  {form.perfil === 'medico' ? (
                                    <div className="flex gap-1">
                                      <input
                                        placeholder="CRM"
                                        value={form.crm_numero}
                                        onChange={e => setForm(f => ({ ...f, crm_numero: e.target.value }))}
                                        className="w-20 rounded border border-slate-300 px-2 py-1"
                                      />
                                      <input
                                        placeholder="UF"
                                        value={form.crm_uf}
                                        onChange={e => setForm(f => ({ ...f, crm_uf: e.target.value.toUpperCase() }))}
                                        className="w-14 rounded border border-slate-300 px-2 py-1"
                                      />
                                    </div>
                                  ) : (
                                    <input
                                      placeholder="Faculdade"
                                      value={form.faculdade}
                                      onChange={e => setForm(f => ({ ...f, faculdade: e.target.value }))}
                                      className="w-36 rounded border border-slate-300 px-2 py-1"
                                    />
                                  )}
                                </td>
                                <td className="py-2 pr-3">
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[p.status]}`}>
                                    {STATUS_LABEL[p.status]}
                                  </span>
                                </td>
                                <td className="py-2 pr-3">
                                  <input type="checkbox" checked={p.crm_conferido} onChange={() => alternarConferido(p)} className="h-4 w-4" />
                                </td>
                                <td className="py-2 pr-3">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => salvarEdicao(p.id)}
                                      disabled={salvando}
                                      className="rounded-full bg-iemesp-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      onClick={cancelarEdicao}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 pr-3">{p.nome}</td>
                                <td className="py-2 pr-3">{p.perfil ? PERFIL_LABEL[p.perfil] : '-'}</td>
                                <td className="py-2 pr-3">
                                  {p.perfil === 'medico' ? `${p.crm_numero ?? '-'}/${p.crm_uf ?? '-'}` : (p.faculdade ?? '-')}
                                </td>
                                <td className="py-2 pr-3">
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[p.status]}`}>
                                    {STATUS_LABEL[p.status]}
                                  </span>
                                </td>
                                <td className="py-2 pr-3">
                                  <input type="checkbox" checked={p.crm_conferido} onChange={() => alternarConferido(p)} className="h-4 w-4" />
                                </td>
                                <td className="py-2 pr-3">
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => iniciarEdicao(p)}
                                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      onClick={() => excluirPedido(p)}
                                      className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                    >
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
