#!/usr/bin/env node
// Localhost-only admin dashboard server.
// Run: npm run admin   (or: node --env-file=.env scripts/admin-server.mjs)

import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  console.error('Run with: npm run admin')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function loadUsers() {
  const usersRes = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (usersRes.error) throw new Error(usersRes.error.message)
  const users = usersRes.data.users

  const { data: subs }  = await supabase.from('subscriptions').select('*')
  const { data: teams } = await supabase.from('teams').select('id, user_id, name')

  const subByUser = new Map((subs || []).map(s => [s.user_id, s]))
  const teamsByUser = new Map()
  for (const t of teams || []) {
    if (!teamsByUser.has(t.user_id)) teamsByUser.set(t.user_id, [])
    teamsByUser.get(t.user_id).push(t)
  }

  return users.map(u => {
    const s = subByUser.get(u.id)
    const userTeams = teamsByUser.get(u.id) || []
    return {
      id:                     u.id,
      email:                  u.email || '(no email)',
      provider:               u.app_metadata?.provider || '?',
      confirmed:              !!u.email_confirmed_at,
      signup:                 u.created_at,
      last_seen:              u.last_sign_in_at,
      plan:                   s?.plan || 'none',
      plan_override:          s?.plan_override || null,
      trial_end:              s?.trial_end || null,
      stripe_customer_id:     s?.stripe_customer_id || null,
      stripe_subscription_id: s?.stripe_subscription_id || null,
      teams:                  userTeams.length,
      team_names:             userTeams.map(t => t.name),
    }
  })
}

const PORT = Number(process.env.ADMIN_PORT) || 8787

const server = createServer(async (req, res) => {
  // Defense in depth: refuse anything not from the local machine.
  const ra = req.socket.remoteAddress || ''
  if (!ra.startsWith('127.') && ra !== '::1' && ra !== '::ffff:127.0.0.1') {
    res.writeHead(403); res.end('forbidden'); return
  }

  try {
    if (req.url === '/' || req.url === '/index.html' || req.url === '/admin.html') {
      const html = await readFile(join(__dirname, 'admin.html'), 'utf8')
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
      res.end(html)
      return
    }
    if (req.url === '/api/users' || req.url.startsWith('/api/users?')) {
      const users = await loadUsers()
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify(users))
      return
    }
    res.writeHead(404); res.end('not found')
  } catch (err) {
    console.error('admin-server error:', err)
    res.writeHead(500, { 'content-type': 'text/plain' })
    res.end(String(err?.message || err))
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log('')
  console.log(`  SquadIQ Admin → http://localhost:${PORT}`)
  console.log(`  Localhost only (bound to 127.0.0.1).  Press Ctrl+C to stop.`)
  console.log('')
})
