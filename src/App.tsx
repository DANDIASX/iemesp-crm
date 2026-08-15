import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, RequireAuth } from './lib/auth'
import Layout from './components/Layout'
import LoginPage from './components/LoginPage'
import PipelinePage from './components/PipelinePage'
import StudentsPage from './components/StudentsPage'
import StudentDetailPage from './components/StudentDetailPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<Layout />}>
              <Route path="/pipeline" element={<PipelinePage />} />
              <Route path="/alunos" element={<StudentsPage />} />
              <Route path="/alunos/:id" element={<StudentDetailPage />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/pipeline" replace />} />
          <Route path="*" element={<Navigate to="/pipeline" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
