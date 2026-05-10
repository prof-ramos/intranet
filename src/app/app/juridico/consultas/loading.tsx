export default function ConsultasLoading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 animate-pulse rounded-full bg-base-200" />
          <div>
            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-base-200" />
            <div className="h-8 w-40 animate-pulse rounded bg-base-200" />
          </div>
        </div>
        <div className="h-11 w-36 animate-pulse rounded-lg bg-base-200" />
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="h-12 w-full max-w-md animate-pulse rounded-lg bg-base-200" />
        <div className="h-12 w-36 animate-pulse rounded-lg bg-base-200" />
      </div>

      <div className="rounded-box bg-base-100 overflow-hidden border border-base-200">
        <div className="border-b border-base-200 px-4 py-3">
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-base-200" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-base-200 px-4 py-4 last:border-0">
            <div className="grid grid-cols-6 items-center gap-4">
              <div className="h-4 w-24 animate-pulse rounded bg-base-200" />
              <div className="h-4 w-full animate-pulse rounded bg-base-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-base-200" />
              <div className="h-6 w-20 animate-pulse rounded bg-base-200" />
              <div className="h-4 w-16 animate-pulse rounded bg-base-200" />
              <div className="h-4 w-12 animate-pulse rounded bg-base-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
