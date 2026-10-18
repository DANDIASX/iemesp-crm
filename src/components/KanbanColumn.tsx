import React from 'react'
import LeadCard from './LeadCard'
import type { Curso, Lead, PipelineStage } from '../types'

type Props = {
  label: string
  badgeClass: string
  leads: Lead[]
  cursos: Curso[]
  updatingId: string | null
  onMoveStage: (lead: Lead, stage: PipelineStage) => void
  onMarkPaid: (lead: Lead, payment: { valor_curso: number | null; forma_pagamento: string | null }) => void
  onDelete: (lead: Lead) => void
}

export default function KanbanColumn({ label, badgeClass, leads, cursos, updatingId, onMoveStage, onMarkPaid, onDelete }: Props) {
  return (
    <div className="w-72 shrink-0 rounded-xl bg-slate-100 p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>{label}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{leads.length}</span>
      </div>
      <div className="max-h-[calc(100vh-320px)] space-y-2 overflow-y-auto">
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            cursos={cursos}
            updating={updatingId === lead.id}
            onMoveStage={onMoveStage}
            onMarkPaid={onMarkPaid}
            onDelete={onDelete}
          />
        ))}
        {leads.length === 0 && (
          <div className="py-4 text-center text-xs text-slate-400">Vazio</div>
        )}
      </div>
    </div>
  )
}
