CRM IEMESP

Painel interno para a equipe IEMESP acompanhar leads (pipeline) e alunos matriculados (progresso no curso prático). Usa o mesmo banco Supabase do formulário público de captação de leads.

## Rodar localmente

1. Copie `.env.example` para `.env` e preencha com as mesmas credenciais Supabase do projeto `iemesp-formulario`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Instale dependências: `npm install`
3. Rode em desenvolvimento: `npm run dev`
4. Abra `http://localhost:5173/`

## Acesso

Login por link de email (magic link), sem senha. Só emails já cadastrados na equipe (Supabase Dashboard → Authentication → Users) conseguem entrar — não há autocadastro.

## Deploy

Mesmo processo do `iemesp-formulario`: GitHub → Vercel (free tier) → domínio `crm.iemesp.com.br` via CNAME.

## Cadastro de módulos e aulas do curso

A estrutura do curso (`course_modules`, `course_lessons`) é cadastrada manualmente pelo Table Editor do Supabase — não há tela de administração dedicada no CRM v1, já que o conteúdo do curso muda raramente.
