import React from 'react'
import { LanguageSwitcher } from '@/components/common/LanguageSwitcher'
import { GerminosBrandPanel } from '@/components/auth/GerminosBrandPanel'

interface AuthLayoutProps {
  pageTitle: string
  title: string
  subtitle: string
  children: React.ReactNode
}

export function AuthLayout({ pageTitle, title, subtitle, children }: AuthLayoutProps) {
  React.useEffect(() => {
    document.title = pageTitle
  }, [pageTitle])

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-400/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="md:col-span-2 p-8 sm:p-10 bg-gradient-to-br from-white/10 via-white/5 to-transparent border-b md:border-b-0 md:border-r border-white/10 flex items-center">
            <GerminosBrandPanel />
          </div>

          <div className="md:col-span-3 p-8 sm:p-10">
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">{title}</h1>
              <p className="mt-2 text-sm sm:text-base text-white/70">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
