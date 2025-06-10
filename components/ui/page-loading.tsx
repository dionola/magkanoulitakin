type PageLoadingProps = {
  title: string
  subtitle?: string
  invert?: boolean
}

export function PageLoading({ title, subtitle, invert = false }: PageLoadingProps) {
  const backgroundClass = invert ? 'bg-foreground text-background' : 'bg-background text-foreground'
  const mutedClass = invert ? 'text-background/50' : 'text-foreground/50'
  const borderClass = invert ? 'border-background/15' : 'border-foreground/15'
  const shimmerClass = invert ? 'bg-background/10' : 'bg-foreground/10'

  return (
    <div className={`min-h-dvh ${backgroundClass}`}>
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-8">
        <div className="mb-12">
          <div className={`h-4 w-28 rounded-full ${shimmerClass} animate-pulse mb-4`} />
          <div className={`h-12 w-64 rounded-full ${shimmerClass} animate-pulse mb-3`} />
          <p className={`text-sm font-medium ${mutedClass}`}>{subtitle ?? 'loading data...'}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr,0.8fr]">
          <div className={`rounded-3xl border ${borderClass} p-6 md:p-8`}>
            <h2 className="text-2xl font-bold mb-6">{title}</h2>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className={`h-16 rounded-2xl ${shimmerClass} animate-pulse`} />
              ))}
            </div>
          </div>

          <div className={`rounded-3xl border ${borderClass} p-6 md:p-8`}>
            <div className={`h-8 w-40 rounded-full ${shimmerClass} animate-pulse mb-6`} />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className={`h-12 rounded-2xl ${shimmerClass} animate-pulse`} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
