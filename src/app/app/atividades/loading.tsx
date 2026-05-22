export default function AtividadesLoading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      {/* Header skeleton */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-2 h-4 w-32 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
          <div className="h-10 w-48 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-11 w-32 rounded-lg bg-[#f8fafc] motion-safe:animate-pulse" />
          <div className="h-11 w-36 rounded-lg bg-[#f8fafc] motion-safe:animate-pulse" />
        </div>
      </div>

      {/* Filtros skeleton */}
      <div className="mb-6 flex flex-wrap gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-lg bg-[#f8fafc] motion-safe:animate-pulse" />
        ))}
      </div>

      {/* Kanban skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, col) => (
          <div
            key={col}
            className="min-h-[400px] rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white p-3"
          >
            {/* Column header */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded bg-[#eef1f6] motion-safe:animate-pulse" />
                <div className="h-4 w-24 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
              </div>
              <div className="h-4 w-6 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, card) => (
                <div
                  key={card}
                  className="rounded-[8px] border border-[rgba(4,9,32,0.05)] bg-white p-3"
                >
                  <div className="mb-2 h-4 w-full rounded bg-[#f8fafc] motion-safe:animate-pulse" />
                  <div className="mb-1 h-3 w-16 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
                  <div className="flex items-center justify-between">
                    <div className="h-3 w-20 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
                    <div className="h-3 w-14 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
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
