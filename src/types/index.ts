export type PipelineStage = 'novo' | 'contatado' | 'matriculado' | 'perdido'

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
  instituicao: string | null
  cargo: string | null
  origem: string | null
  consentimento_lgpd: boolean | null
  pipeline_stage: PipelineStage
  stage_updated_at: string
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
