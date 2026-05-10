export default function ConsultaDetalheLoading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-base-200" />
          <div>
            <div className="mb-2 h-4 w-32 animate-pulse rounded bg-base-200" />
            <div className="h-8 w-56 animate-pulse rounded bg-base-200" />
          </div>
        </div>
        <div className="h-10 w-40 animate-pulse rounded-lg bg-base-200" />
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="rounded-box bg-base-100 min-h-[300px] p-5">
            <div className="mb-4 flex gap-2">
              <div className="h-6 w-20 animate-pulse rounded bg-base-200" />
              <div className="h-6 w-32 animate-pulse rounded bg-base-200" />
            </div>
            <div className="mb-2 h-7 w-3/4 animate-pulse rounded bg-base-200" />
            <div className="mb-4 h-5 w-1/2 animate-pulse rounded bg-base-200" />
            <div className="mb-4 h-24 w-full animate-pulse rounded bg-base-200" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-4 w-full animate-pulse rounded bg-base-200" />
              <div className="h-4 w-full animate-pulse rounded bg-base-200" />
              <div className="h-4 w-full animate-pulse rounded bg-base-200" />
              <div className="h-4 w-full animate-pulse rounded bg-base-200" />
            </div>
          </div>

          <div className="rounded-box bg-base-100 min-h-[200px] p-5">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-base-200" />
            <div className="flex flex-col gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[32px_1fr] gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-base-200" />
                  <div>
                    <div className="mb-2 h-4 w-40 animate-pulse rounded bg-base-200" />
                    <div className="h-3 w-full animate-pulse rounded bg-base-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-box bg-base-100 min-h-[180px] p-5">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-base-200" />
            <div className="h-20 w-full animate-pulse rounded bg-base-200" />
          </div>
        </div>

        <div className="rounded-box bg-base-100 min-h-[200px] p-4">
          <div className="mb-3 h-6 w-24 animate-pulse rounded bg-base-200" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-base-200" />
                <div className="h-4 w-20 animate-pulse rounded bg-base-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
