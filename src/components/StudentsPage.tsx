import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Student, StudentProgress } from '../types'

const STATUS_LABEL: Record<Student['status'], string> = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  trancado: 'Trancado',
  desistente: 'Desistente',
}

const STATUS_BADGE: Record<Student['status'], string> = {
  ativo: 'bg-blue-100 text-blue-800',
  concluido: 'bg-emerald-100 text-emerald-800',
  trancado: 'bg-amber-100 text-amber-800',
  desistente: 'bg-red-100 text-red-800',
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [progressByStudent, setProgressByStudent] = useState<Record<string, number>>({})
  const [totalLessons, setTotalLessons] = useState(0)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    const [studentsRes, lessonsRes, progressRes] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('course_lessons').select('id'),
      supabase.from('student_progress').select('student_id'),
    ])

    if (studentsRes.error) {
      setMessage(`Erro ao carregar alunos: ${studentsRes.error.message}`)
    } else {
      setStudents((studentsRes.data as Student[]) || [])
    }

    setTotalLessons(lessonsRes.data?.length || 0)

    const counts: Record<string, number> = {}
    ;((progressRes.data as Pick<StudentProgress, 'student_id'>[]) || []).forEach(p => {
      counts[p.student_id] = (counts[p.student_id] || 0) + 1
    })
    setProgressByStudent(counts)

    setLoading(false)
  }

  return (
    <div>
      <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Alunos</h1>
      <p className="mt-2 text-slate-600">Acompanhe quem está matriculado e o progresso no curso prático.</p>

      {message && <p className="mt-4 text-sm text-red-600">{message}</p>}

      <div className="mt-6 space-y-4">
        {loading && <p className="text-slate-500">Carregando...</p>}

        {!loading && students.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhum aluno matriculado ainda. Alunos aparecem aqui automaticamente quando um lead é movido para "Matriculado" em Leads.
          </div>
        )}

        {students.map(student => {
          const done = progressByStudent[student.id] || 0
          const pct = totalLessons > 0 ? Math.round((done / totalLessons) * 100) : 0

          return (
            <Link
              key={student.id}
              to={`/alunos/${student.id}`}
              className="block rounded-2xl bg-white p-5 shadow transition hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-iemesp-900">{student.nome}</p>
                  <p className="text-sm text-slate-600">{student.telefone || student.email || '—'}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE[student.status]}`}>
                  {STATUS_LABEL[student.status]}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Progresso no curso</span>
                  <span>{totalLessons > 0 ? `${pct}% (${done}/${totalLessons} aulas)` : 'sem aulas cadastradas'}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-iemesp-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
