'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShieldCheck, Loader2, Code2 } from 'lucide-react'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    const cleanInput = identifier.trim().toLowerCase()
    const loginEmail = cleanInput.includes('@')
      ? cleanInput
      : `${cleanInput.replace(/\s+/g, '')}@counter.ceylinco.lk`

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: password,
      })

      if (error) {
        throw new Error(error.message || 'Invalid username/email or password.')
      }

      if (data?.session) {
        window.location.href = '/dashboard'
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-slate-950 px-4 py-8">
      <div className="w-full flex-1 flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 bg-blue-600/20 text-blue-500 rounded-full flex items-center justify-center mb-2">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Ceylinco VIP Approval
            </CardTitle>
            <CardDescription className="text-slate-400">
              Dehiattakandiya Branch & VIP Counter Network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 text-sm rounded bg-red-950/50 border border-red-800 text-red-400">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-slate-200">
                  Username or Official Email
                </Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="e.g. mahaoya / siripura / manager@ceylinco.lk"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-700 text-white placeholder:text-slate-500"
                />
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing In...
                  </>
                ) : (
                  'Sign In to Portal'
                )}
              </Button>

              <div className="text-center text-sm text-slate-400 pt-2">
                Manager / Admin registration?{' '}
                <Link href="/signup" className="text-blue-400 hover:underline">
                  Create Account
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <footer className="text-center text-xs text-slate-500 space-y-1 pt-6">
        <div className="flex items-center justify-center gap-1.5 font-medium text-slate-400">
          <Code2 className="w-4 h-4 text-blue-500" />
          <span>Designed & Developed by <strong className="text-blue-400 font-semibold">Ceylon Digi Solutions</strong></span>
        </div>
        <p className="text-[11px] text-slate-500">
          System Architecture & Engineering by <strong className="text-slate-300">Kavindu Dilhara</strong> (Founder, Ceylon Digi Solutions)
        </p>
      </footer>
    </div>
  )
}