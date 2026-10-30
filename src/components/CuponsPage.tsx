import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Cupom, CupomTipo, Curso } from '../types'

const TIPO_LABEL: Record<CupomTipo, string> = {
  percentual: '%',
  valor_fixo: 'R$',
}

const SITE_URL = 'https://formulario.iemesp.com.br'

const MEDIUM_OPCOES = [
  { value: 'parceria', label: 'Parceria (mensagem direta)' },
  { value: 'bio', label: 'Bio do Instagram' },
  { value: 'grupo', label: 'Grupo de WhatsApp' },
]

const slugify = (texto: string) =>
  texto
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export default function CuponsPage() {
  const [cupons, setCupons] = useState<Cupom[]>([])
  const [cursos, setCursos] = useState<Curso[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [codigo, setCodigo] = useState('')
  const [tipo, setTipo] = useState<CupomTipo>('percentual')
  const [valor, setValor] = useState('')
  const [cursoId, setCursoId] = useState('')
  const [parceiro, setParceiro] = useState('')
  const [limiteUsos, setLimiteUsos] = useState('')
  const [validoAte, setValidoAte] = useState('')
  const [salvando, setSalvando] = useState(false)

  const [linkAbertoId, setLinkAbertoId] = useState<string | null>(null)
  const [linkCursoId, setLinkCursoId] = useState('')
  const [linkMedium, setLinkMedium] = useState(MEDIUM_OPCOES[0].value)
  const [linkCopiado, setLinkCopiado] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [cuponsRes, cursosRes] = await Promise.all([
      supabase.from('cupons').select('*').order('created_at', { ascending: false }),
      supabase.from('cursos').select('*').order('titulo'),
    ])

    if (cuponsRes.error) setMessage(`Erro ao carregar cupons: ${cuponsRes.error.message}`)
    setCupons((cuponsRes.data as Cupom[]) || [])
    setCursos((cursosRes.data as Curso[]) || [])
    setLoading(false)
  }

  const cursoTitulo = (id: string | null) => cursos.find(c => c.id === id)?.titulo ?? 'Todos os cursos'

  const resetForm = () => {
    setCodigo('')
    setTipo('percentual')
    setValor('')
    setCursoId('')
    setParceiro('')
    setLimiteUsos('')
    setValidoAte('')
  }

  const criarCupom = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!codigo.trim() || !valor || Number(valor) <= 0) {
      setMessage('Informe um código e um valor de desconto válidos.')
      return
    }

    setSalvando(true)
    const { error } = await supabase.from('cupons').insert([{
      codigo: codigo.trim(),
      tipo,
      valor: Number(valor),
      curso_id: cursoId || null,
      parceiro: parceiro.trim() || null,
      limite_usos: limiteUsos ? Number(limiteUsos) : null,
      valido_ate: validoAte ? new Date(validoAte).toISOString() : null,
      ativo: true,
    }])

    if (error) {
      setMessage(`Erro ao criar cupom: ${error.message}`)
    } else {
      resetForm()
      await load()
    }
    setSalvando(false)
  }

  const alternarAtivo = async (cupom: Cupom) => {
    const { error } = await supabase.from('cupons').update({ ativo: !cupom.ativo }).eq('id', cupom.id)
    if (error) setMessage(`Erro ao atualizar cupom: ${error.message}`)
    await load()
  }

  const excluirCupom = async (cupom: Cupom) => {
    if (!confirm(`Excluir o cupom "${cupom.codigo}"? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.from('cupons').delete().eq('id', cupom.id)
    if (error) {
      setMessage(
        error.code === '23503'
          ? `Não foi possível excluir "${cupom.codigo}" — ele já foi usado em algum pedido. Desative-o em vez de excluir.`
          : `Erro ao excluir cupom: ${error.message}`
      )
    } else {
      setMessage('')
    }
    await load()
  }

  const abrirLink = (cupom: Cupom) => {
    setLinkAbertoId(cupom.id)
    setLinkCursoId(cupom.curso_id ?? cursos[0]?.id ?? '')
    setLinkMedium(MEDIUM_OPCOES[0].value)
    setLinkCopiado(false)
  }

  const montarLink = (cupom: Cupom) => {
    const curso = cursos.find(c => c.id === linkCursoId)
    if (!curso) return ''
    const utmSource = slugify(cupom.parceiro || cupom.codigo)
    const params = new URLSearchParams({
      utm_source: utmSource,
      utm_medium: linkMedium,
      utm_campaign: curso.slug,
      cupom: cupom.codigo,
    })
    return `${SITE_URL}/checkout/${curso.slug}?${params.toString()}`
  }

  const copiarLink = async (cupom: Cupom) => {
    const link = montarLink(cupom)
    if (!link) return
    await navigator.clipboard.writeText(link)
    setLinkCopiado(true)
  }

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Cupons</h1>
      <p className="mt-2 text-slate-600">Crie cupons de desconto e gere links rastreáveis para cada parceiro (liga, grupo de plantão etc.).</p>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}

      <form onSubmit={criarCupom} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow">
        <div>
          <label className="block text-xs font-medium text-slate-500">Código</label>
          <input
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            placeholder="Ex.: LIGA-LAHTC"
            className="mt-1 w-40 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Parceiro</label>
          <input
            value={parceiro}
            onChange={e => setParceiro(e.target.value)}
            placeholder="Ex.: Liga LAHTC"
            className="mt-1 w-40 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Tipo</label>
          <select
            value={tipo}
            onChange={e => setTipo(e.target.value as CupomTipo)}
            className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="percentual">Percentual (%)</option>
            <option value="valor_fixo">Valor fixo (R$)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Valor ({TIPO_LABEL[tipo]})</label>
          <input
            type="number"
            step="0.01"
            value={valor}
            onChange={e => setValor(e.target.value)}
            className="mt-1 w-28 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Curso</label>
          <select
            value={cursoId}
            onChange={e => setCursoId(e.target.value)}
            className="mt-1 w-48 rounded border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos os cursos</option>
            {cursos.map(c => (
              <option key={c.id} value={c.id}>{c.titulo}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Limite de usos</label>
          <input
            type="number"
            value={limiteUsos}
            onChange={e => setLimiteUsos(e.target.value)}
            placeholder="Opcional"
            className="mt-1 w-28 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Válido até</label>
          <input
            type="date"
            value={validoAte}
            onChange={e => setValidoAte(e.target.value)}
            className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={salvando}
          className="rounded-full bg-iemesp-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-60"
        >
          {salvando ? 'Criando...' : 'Criar cupom'}
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {loading && <p className="text-slate-500">Carregando...</p>}

        {!loading && cupons.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhum cupom criado ainda.
          </div>
        )}

        {cupons.map(cupom => (
          <div key={cupom.id} className="rounded-2xl bg-white p-5 shadow">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-iemesp-900">
                  {cupom.codigo}
                  {cupom.parceiro && <span className="ml-2 text-sm font-normal text-slate-500">· {cupom.parceiro}</span>}
                </p>
                <p className="text-sm text-slate-600">
                  {cupom.tipo === 'percentual' ? `${Number(cupom.valor)}% de desconto` : `${TIPO_LABEL.valor_fixo} ${Number(cupom.valor).toFixed(2)} de desconto`}
                  {' · '}{cursoTitulo(cupom.curso_id)}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {cupom.usos} uso{cupom.usos === 1 ? '' : 's'}
                  {cupom.limite_usos ? ` de ${cupom.limite_usos}` : ''}
                  {cupom.valido_ate ? ` · válido até ${new Date(cupom.valido_ate).toLocaleDateString('pt-BR')}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${cupom.ativo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {cupom.ativo ? 'Ativo' : 'Desativado'}
                </span>
                <button
                  onClick={() => linkAbertoId === cupom.id ? setLinkAbertoId(null) : abrirLink(cupom)}
                  className="rounded-full bg-iemesp-900/10 px-4 py-2 text-sm font-semibold text-iemesp-900 transition hover:bg-iemesp-900/20"
                >
                  {linkAbertoId === cupom.id ? 'Fechar' : 'Gerar link'}
                </button>
                <button
                  onClick={() => alternarAtivo(cupom)}
                  className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                >
                  {cupom.ativo ? 'Desativar' : 'Reativar'}
                </button>
                <button
                  onClick={() => excluirCupom(cupom)}
                  className="rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                >
                  Excluir
                </button>
              </div>
            </div>

            {linkAbertoId === cupom.id && (
              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Curso do link</label>
                    <select
                      value={linkCursoId}
                      onChange={e => { setLinkCursoId(e.target.value); setLinkCopiado(false) }}
                      className="mt-1 w-56 rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      {cursos.map(c => (
                        <option key={c.id} value={c.id}>{c.titulo}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Canal</label>
                    <select
                      value={linkMedium}
                      onChange={e => { setLinkMedium(e.target.value); setLinkCopiado(false) }}
                      className="mt-1 w-56 rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      {MEDIUM_OPCOES.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={montarLink(cupom)}
                    className="flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={() => copiarLink(cupom)}
                    className="shrink-0 rounded-full bg-iemesp-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-iemesp-700"
                  >
                    {linkCopiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                {!cupom.parceiro && (
                  <p className="mt-2 text-xs text-amber-600">
                    Esse cupom não tem parceiro definido — o link usa o código do cupom como identificação. Crie um novo cupom com o campo "Parceiro" preenchido se quiser algo mais legível nos relatórios.
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
