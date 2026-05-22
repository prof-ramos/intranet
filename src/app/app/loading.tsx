export default function AppLoading() {
  return (
    <div className="drawer md:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" aria-hidden="true" />

      <div className="drawer-content flex flex-col">
        <header className="flex items-center justify-between border-b border-[rgba(4,9,32,0.05)] bg-white md:hidden">
          <div className="inline-flex h-11 w-11 animate-pulse items-center justify-center rounded-full bg-[#f8fafc]" />
        </header>

        <div className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-7 sm:px-8 lg:px-10">
          <div className="mb-5 h-8 w-48 animate-pulse rounded bg-[#f8fafc]" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="min-h-[104px] animate-pulse rounded-[16px] border border-[rgba(4,9,32,0.05)] bg-white px-4 py-3"
              >
                <div className="mb-2 h-3 w-20 rounded bg-[#f8fafc]" />
                <div className="h-8 w-16 rounded bg-[#f8fafc]" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="drawer-side z-40">
        <div className="min-h-full w-[288px] animate-pulse bg-[#f8fafc]" />
      </div>
    </div>
  );
}
