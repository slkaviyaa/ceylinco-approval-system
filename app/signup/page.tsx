'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2, KeyRound } from 'lucide-react'

const AUTHORIZED_SECRET_CODE = 'CEY2026CDS'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'manager' | 'admin'>('manager')
  const [secretCode, setSecretCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const router = useRouter()
  const supabase = createClient()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')

    if (secretCode.trim() !== AUTHORIZED_SECRET_CODE) {
      setErrorMsg('Invalid Branch Security Authorization Code. Access Denied.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.')
      setLoading(false)
      return
    }

    try {
      // Direct Admin API Call to Bypass Supabase Email Rate Limits & Auto-Confirm
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email: email.trim().toLowerCase(),
          username: email.trim().toLowerCase().split('@')[0],
          password: password,
          role: role,
          counter_name: 'Dehiattakandiya_Main',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create administrative account.')

      // Auto sign-in immediately
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (signInError) throw signInError

      setSuccessMsg(`Account created successfully as ${role === 'manager' ? 'Branch Manager' : 'System Administrator'}! Redirecting...`)
      setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 1200)
    } catch (error: any) {
      setErrorMsg(error.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Administrative Registration
          </CardTitle>
          <CardDescription className="text-slate-400">
            Authorized Account Creation for Dehiattakandiya Branch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-sm rounded bg-red-950/60 border border-red-800 text-red-400">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-sm rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">
                {successMsg}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-200">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="e.g. Munesh Danushka"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Official Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="danushka.ceylincovip@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-slate-200">Account Post / Designation</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'manager' | 'admin')}
                className="w-full h-10 px-3 rounded-md bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
              >
                <option value="manager">Branch Manager</option>
                <option value="admin">System Administrator (Admin)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secretCode" className="text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Branch Security Code
              </Label>
              <Input
                id="secretCode"
                type="password"
                placeholder="Enter Authorization Code"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 tracking-wider font-mono"
              />
              <p className="text-[11px] text-slate-500">
                * Required to prevent unauthorized registrations.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 transition duration-200"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating Account...
                </>
              ) : (
                'Register Administrative Account'
              )}
            </Button>

            <div className="text-center text-sm text-slate-400 pt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-400 hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}