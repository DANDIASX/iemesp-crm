import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  if (session) return <Navigate to="/pipeline" replace />

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setMessage(`Erro ao entrar: ${error.message}`)
    }
    setLoading(false)
  }

  const handleMagicLink = async () => {
    if (!email) {
      setMessage('Digite seu email antes de pedir o link.')
      return
    }
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
        <p className="mt-3 text-slate-600">Entre com seu email e senha.</p>
        <form onSubmit={handlePasswordLogin} className="mt-8 space-y-4">
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
          <div>
            <label className="block text-sm font-medium text-slate-700">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-2 block w-full rounded border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-iemesp-900 focus:outline-none"
              placeholder="Sua senha"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-iemesp-900 px-5 py-3 text-lg font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <button
          onClick={handleMagicLink}
          disabled={loading}
          className="mt-4 w-full rounded px-5 py-2 text-sm font-semibold text-iemesp-900 underline decoration-dotted transition hover:text-iemesp-700 disabled:opacity-60"
        >
          Ou receber um link de acesso por email
        </button>

        {message && <p className="mt-6 text-sm text-iemesp-900">{message}</p>}
        <p className="mt-6 text-xs text-slate-500">
          Só emails já cadastrados pela equipe conseguem entrar. Se você deveria ter acesso e não consegue entrar, peça para o administrador te adicionar no Supabase.
        </p>
      </div>
    </div>
  )
}
