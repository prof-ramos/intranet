export default function AssociadosLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="sticky top-0 z-20 border-b border-[rgba(4,9,32,0.05)] bg-white px-5 py-3 sm:px-8 lg:px-10">
        <div className="mx-auto grid w-full max-w-[1180px] gap-3 sm:grid-cols-[minmax(240px,420px)_auto] sm:items-center">
          <div className="h-11 w-full rounded-md bg-[#f8fafc] motion-safe:animate-pulse" />
          <div className="hidden h-11 w-11 rounded-full bg-[#f8fafc] motion-safe:animate-pulse sm:block" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
        {/* Título skeleton */}
        <div className="mb-7 flex flex-col gap-3">
          <div className="h-4 w-48 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
          <div className="h-8 w-64 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
        </div>

        {/* Tabela skeleton */}
        <div className="rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white">
          <div className="border-b border-[rgba(4,9,32,0.05)] px-4 py-3">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
              ))}
            </div>
          </div>

          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b border-[rgba(4,9,32,0.05)] px-4 py-4 last:border-0">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="h-4 w-full rounded bg-[#f8fafc] motion-safe:animate-pulse" />
                <div className="h-4 w-3/4 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
                <div className="h-4 w-2/3 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
