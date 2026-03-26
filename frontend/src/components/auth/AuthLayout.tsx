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
    <div className="relative min-h-screen w-full bg-gradient-to-br from-slate-50 via-indigo-50/30 to-fuchsia-50/20 text-zinc-900 flex items-center justify-center px-4 py-10 overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-violet-400/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-4xl">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 rounded-2xl overflow-hidden bg-white border border-zinc-200/70 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <div className="md:col-span-2 p-8 sm:p-10 bg-gradient-to-br from-indigo-100/60 via-white to-sky-100/60 border-b md:border-b-0 md:border-r border-zinc-200/70 flex items-center">
            <GerminosBrandPanel />
          </div>

          <div className="md:col-span-3 p-8 sm:p-10">
            <div className="mb-7">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-950">{title}</h1>
              <p className="mt-2 text-sm sm:text-base text-zinc-700">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
