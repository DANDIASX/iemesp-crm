import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (password.length < 6) {
      setMessage('A senha precisa ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setMessage('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setMessage(`Erro ao salvar senha: ${error.message}`)
    } else {
      navigate('/pipeline', { replace: true })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-iemesp-cream px-4">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-8 shadow-2xl">
        <h1 className="text-3xl font-poppins font-bold text-iemesp-900">Definir senha</h1>
        <p className="mt-3 text-slate-600">Escolha uma senha para entrar direto no CRM da próxima vez.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Nova senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-2 block w-full rounded border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-iemesp-900 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Confirmar senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="mt-2 block w-full rounded border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 focus:border-iemesp-900 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-iemesp-900 px-5 py-3 text-lg font-semibold text-white transition hover:bg-iemesp-700 disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar senha'}
          </button>
        </form>
        {message && <p className="mt-6 text-sm text-iemesp-900">{message}</p>}
      </div>
    </div>
  )
}
