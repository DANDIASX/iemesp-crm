import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (session) return <Navigate to="/pipeline" replace />

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('Enviando link de acesso ao seu email...')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/pipeline`,
      },
    })

    if (error) {
      setMessage(`Erro ao enviar link: ${error.message}`)
    } else {
      setMessage('Verifique seu email — enviamos um link de acesso.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-iemesp-cream px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-poppins font-bold text-iemesp-900">CRM IEMESP</h1>
        <p className="mt-3 text-slate-600">Digite seu email para receber um link de acesso.</p>
        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Seu email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-2 block w-full rounded border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-iemesp-900 focus:outline-none"
              placeholder="voce@iemesp.com.br"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-iemesp-900 px-5 py-3 text-lg font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-60"
          >
            {loading ? 'Enviando...' : 'Enviar link de acesso'}
          </button>
        </form>
        {message && <p className="mt-6 text-sm text-iemesp-900">{message}</p>}
        <p className="mt-6 text-xs text-slate-500">
          Só emails já cadastrados pela equipe conseguem entrar. Se você deveria ter acesso e não recebeu o link, peça para o administrador te adicionar no Supabase.
        </p>
      </div>
    </div>
  )
}
