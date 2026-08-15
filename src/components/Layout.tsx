import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-5 py-2 text-sm font-semibold transition ${
    isActive ? 'bg-iemesp-900 text-white' : 'text-iemesp-900 hover:bg-iemesp-900/10'
  }`

export default function Layout() {
  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen bg-iemesp-cream">
      <header className="border-b border-iemesp-900/10 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <span className="text-xl font-poppins font-bold text-iemesp-900">CRM IEMESP</span>
          <nav className="flex flex-wrap items-center gap-2">
            <NavLink to="/pipeline" className={linkClass}>Leads</NavLink>
            <NavLink to="/alunos" className={linkClass}>Alunos</NavLink>
            <button
              onClick={signOut}
              className="rounded-full px-5 py-2 text-sm font-semibold text-slate-500 transition hover:bg-slate-100"
            >
              Sair
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
