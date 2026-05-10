export default function AssociadosLoading() {
  return (
    <div>
      {/* Header skeleton */}
      <div className="border-base-300 bg-base-100 sticky top-0 z-20 border-b px-5 py-3 sm:px-8 lg:px-10">
        <div className="mx-auto grid w-full max-w-[1180px] gap-3 sm:grid-cols-[minmax(240px,420px)_auto] sm:items-center">
          <div className="h-11 w-full animate-pulse rounded-md bg-base-200" />
          <div className="hidden h-11 w-11 animate-pulse rounded-full bg-base-200 sm:block" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
        {/* Título skeleton */}
        <div className="mb-7 flex flex-col gap-3">
          <div className="h-4 w-48 animate-pulse rounded bg-base-200" />
          <div className="h-8 w-64 animate-pulse rounded bg-base-200" />
        </div>

        {/* Tabela skeleton */}
        <div className="rounded-box border border-base-200 bg-base-100">
          <div className="border-base-200 border-b px-4 py-3">
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-base-200" />
              ))}
            </div>
          </div>

          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-base-200 border-b px-4 py-4 last:border-0">
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="h-4 w-full animate-pulse rounded bg-base-200" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-base-200" />
                <div className="h-4 w-1/2 animate-pulse rounded bg-base-200" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-base-200" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
