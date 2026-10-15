export type PipelineStage = 'novo' | 'contatado' | 'negociando' | 'aguardando_pagamento' | 'matriculado' | 'perdido'
export type ProdutoInteresse = 'curso_pratico' | 'plataforma' | 'ambos'

export type Lead = {
  id: string
  created_at: string
  tipo: string | null
  nome: string
  email: string | null
  telefone: string
  crm: string | null
  formacao: string | null
  especializacao: string | null
  trabalho: string | null
  residencia: string | null
  curso_interesse: string | null
  produto_interesse: ProdutoInteresse | null
  instituicao: string | null
  cargo: string | null
  origem: string | null
  consentimento_lgpd: boolean | null
  pipeline_stage: PipelineStage
  stage_updated_at: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  valor_curso: number | null
  pago: boolean
  forma_pagamento: string | null
  data_pagamento: string | null
  como_conheceu: string | null
  disponibilidade: string | null
  objetivo: string | null
}

export type StudentStatus = 'ativo' | 'concluido' | 'trancado' | 'desistente'

export type Student = {
  id: string
  lead_id: string | null
  nome: string
  email: string | null
  telefone: string | null
  status: StudentStatus
  created_at: string
}

export type CourseModule = {
  id: string
  titulo: string
  ordem: number
}

export type CourseLesson = {
  id: string
  module_id: string
  titulo: string
  ordem: number
}

export type StudentProgress = {
  id: string
  student_id: string
  lesson_id: string
  completed_at: string
}

export type Curso = {
  id: string
  slug: string
  titulo: string
  preco_centavos: number
  max_parcelas: number
  ativo: boolean
  created_at: string
}

export type CupomTipo = 'percentual' | 'valor_fixo'

export type Cupom = {
  id: string
  codigo: string
  tipo: CupomTipo
  valor: number
  curso_id: string | null
  valido_de: string | null
  valido_ate: string | null
  limite_usos: number | null
  usos: number
  ativo: boolean
  created_at: string
}

export type PedidoStatus = 'pendente' | 'aprovado' | 'recusado' | 'cancelado' | 'reembolsado'

export type Pedido = {
  id: string
  curso_id: string
  cupom_id: string | null
  lead_id: string | null
  nome: string
  email: string
  telefone: string
  preco_original_centavos: number
  desconto_centavos: number
  valor_final_centavos: number
  status: PedidoStatus
  mp_preference_id: string | null
  mp_payment_id: string | null
  utms: Record<string, unknown> | null
  consentimento_lgpd: boolean
  created_at: string
  pago_em: string | null
}

// Forma como `cursos`/`cupons` chegam embutidos num select com join
// (ex.: supabase.from('pedidos').select('*, cursos(titulo), cupons(codigo)')).
export type PedidoComRelacoes = Pedido & {
  cursos: { titulo: string } | null
  cupons: { codigo: string } | null
}
