import type { ReactNode } from 'react'

export function Spinner({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-sm text-folha-900/60">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-folha-100 border-t-folha-600" />
      {label}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p className="font-display text-xl text-folha-900">{title}</p>
      {children && <div className="max-w-sm text-sm text-folha-900/60">{children}</div>}
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-terra-500/30 bg-terra-500/10 px-4 py-3 text-sm text-terra-600">
      {message}
    </div>
  )
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6">
      {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-terra-600">{eyebrow}</p>}
      <h1 className="font-display text-3xl font-semibold leading-tight text-folha-900 md:text-4xl">{title}</h1>
      {children && <div className="mt-2 text-folha-900/70">{children}</div>}
    </header>
  )
}

const CORES = ['bg-folha-100 text-folha-700', 'bg-palha-100 text-terra-600', 'bg-folha-50 text-folha-600']

/** Imagem do produto ou um bloco com as iniciais quando não há foto. */
export function Foto({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (src) return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />
  const cor = CORES[alt.length % CORES.length]
  const iniciais = alt
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <div aria-hidden className={`flex items-center justify-center font-display text-3xl ${cor} ${className}`}>
      {iniciais}
    </div>
  )
}
