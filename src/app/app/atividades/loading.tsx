export default function AtividadesLoading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      {/* Header skeleton */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 h-4 w-32 animate-pulse rounded bg-[#f8fafc]" />
          <div className="h-10 w-48 animate-pulse rounded bg-[#f8fafc]" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-32 animate-pulse rounded-lg bg-[#f8fafc]" />
          <div className="h-11 w-36 animate-pulse rounded-lg bg-[#f8fafc]" />
        </div>
      </div>

      {/* Filtros skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-28 animate-pulse rounded-lg bg-[#f8fafc]" />
        ))}
      </div>

      {/* Kanban skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div key={col} className="rounded-[16px] min-h-[400px] border border-[rgba(4,9,32,0.05)] bg-white p-3">
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 animate-pulse rounded bg-[#eef1f6]" />
                <div className="h-4 w-24 animate-pulse rounded bg-[#f8fafc]" />
              </div>
              <div className="h-4 w-6 animate-pulse rounded bg-[#f8fafc]" />
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, card) => (
                <div
                  key={card}
                  className="rounded-[8px] border border-[rgba(4,9,32,0.05)] bg-white p-3"
                >
                  <div className="mb-2 h-4 w-full animate-pulse rounded bg-[#f8fafc]" />
                  <div className="mb-1 h-3 w-16 animate-pulse rounded bg-[#f8fafc]" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 animate-pulse rounded bg-[#f8fafc]" />
                    <div className="h-3 w-14 animate-pulse rounded bg-[#f8fafc]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
