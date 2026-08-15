import React, { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { CourseLesson, CourseModule, Student } from '../types'

const STATUS_OPTIONS: { value: Student['status']; label: string }[] = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'trancado', label: 'Trancado' },
  { value: 'desistente', label: 'Desistente' },
]

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [student, setStudent] = useState<Student | null>(null)
  const [modules, setModules] = useState<CourseModule[]>([])
  const [lessons, setLessons] = useState<CourseLesson[]>([])
  const [completedLessonIds, setCompletedLessonIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [savingLessonId, setSavingLessonId] = useState<string | null>(null)

  useEffect(() => {
    if (id) load(id)
  }, [id])

  const load = async (studentId: string) => {
    setLoading(true)
    const [studentRes, modulesRes, lessonsRes, progressRes] = await Promise.all([
      supabase.from('students').select('*').eq('id', studentId).single(),
      supabase.from('course_modules').select('*').order('ordem', { ascending: true }),
      supabase.from('course_lessons').select('*').order('ordem', { ascending: true }),
      supabase.from('student_progress').select('lesson_id').eq('student_id', studentId),
    ])

    if (studentRes.error) {
      setMessage(`Erro ao carregar aluno: ${studentRes.error.message}`)
    } else {
      setStudent(studentRes.data as Student)
    }

    setModules((modulesRes.data as CourseModule[]) || [])
    setLessons((lessonsRes.data as CourseLesson[]) || [])
    setCompletedLessonIds(new Set(((progressRes.data as { lesson_id: string }[]) || []).map(p => p.lesson_id)))
    setLoading(false)
  }

  const toggleLesson = async (lessonId: string) => {
    if (!student) return
    setSavingLessonId(lessonId)
    const alreadyDone = completedLessonIds.has(lessonId)

    if (alreadyDone) {
      await supabase.from('student_progress').delete().eq('student_id', student.id).eq('lesson_id', lessonId)
    } else {
      await supabase.from('student_progress').insert([{ student_id: student.id, lesson_id: lessonId }])
    }

    const next = new Set(completedLessonIds)
    if (alreadyDone) next.delete(lessonId)
    else next.add(lessonId)
    setCompletedLessonIds(next)
    setSavingLessonId(null)
  }

  const changeStatus = async (status: Student['status']) => {
    if (!student) return
    setStudent({ ...student, status })
    await supabase.from('students').update({ status }).eq('id', student.id)
  }

  if (loading) return <p className="text-slate-500">Carregando...</p>
  if (message) return <p className="text-red-600">{message}</p>
  if (!student) return <p className="text-slate-500">Aluno não encontrado.</p>

  const totalLessons = lessons.length
  const doneCount = completedLessonIds.size
  const pct = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0

  return (
    <div>
      <Link to="/alunos" className="text-sm font-semibold text-iemesp-900 hover:underline">
        ← Voltar para Alunos
      </Link>

      <div className="mt-4 rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-poppins font-bold text-iemesp-900">{student.nome}</h1>
            <p className="mt-1 text-sm text-slate-600">{student.telefone || '—'}</p>
            <p className="text-sm text-slate-600">{student.email || '—'}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Status</label>
            <select
              value={student.status}
              onChange={e => changeStatus(e.target.value as Student['status'])}
              className="mt-1 rounded border border-slate-300 px-3 py-2 text-sm"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Progresso no curso</span>
            <span>{totalLessons > 0 ? `${pct}% (${doneCount}/${totalLessons} aulas)` : 'sem aulas cadastradas'}</span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-iemesp-700" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {modules.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500 shadow">
            Nenhum módulo do curso cadastrado ainda. Cadastre em "course_modules" e "course_lessons" pelo Table Editor do Supabase.
          </div>
        )}

        {modules.map(module => (
          <div key={module.id} className="rounded-2xl bg-white p-5 shadow">
            <h2 className="text-lg font-semibold text-iemesp-900">{module.titulo}</h2>
            <div className="mt-3 space-y-2">
              {lessons.filter(l => l.module_id === module.id).map(lesson => {
                const done = completedLessonIds.has(lesson.id)
                return (
                  <label
                    key={lesson.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={savingLessonId === lesson.id}
                      onChange={() => toggleLesson(lesson.id)}
                      className="h-5 w-5 rounded border-slate-300 text-iemesp-700 focus:ring-iemesp-700"
                    />
                    <span className={done ? 'text-slate-500 line-through' : 'text-slate-800'}>{lesson.titulo}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
