export default function JuridicoLoading() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-5 py-7 sm:px-8 lg:px-10">
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

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="min-h-[104px] rounded-[16px] bg-white p-4">
            <div className="mb-3 h-3 w-32 animate-pulse rounded bg-[#f8fafc]" />
            <div className="h-8 w-16 animate-pulse rounded bg-[#f8fafc]" />
          </div>
        ))}
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-h-[300px] rounded-[16px] bg-white p-5">
          <div className="mb-4 h-6 w-40 animate-pulse rounded bg-[#f8fafc]" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[24px_1fr] gap-3 pb-3">
                <div className="h-5 w-5 animate-pulse rounded bg-[#f8fafc]" />
                <div>
                  <div className="mb-2 h-4 w-full animate-pulse rounded bg-[#f8fafc]" />
                  <div className="h-3 w-48 animate-pulse rounded bg-[#f8fafc]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[200px] rounded-[16px] bg-white p-4">
          <div className="mb-3 h-6 w-40 animate-pulse rounded bg-[#f8fafc]" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-5 animate-pulse rounded bg-[#f8fafc]" />
                  <div className="h-4 w-32 animate-pulse rounded bg-[#f8fafc]" />
                </div>
                <div className="h-4 w-6 animate-pulse rounded bg-[#f8fafc]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
