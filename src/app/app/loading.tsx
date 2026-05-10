export default function AppLoading() {
  return (
    <div className="drawer md:drawer-open min-h-screen">
      <input id="app-drawer" type="checkbox" className="drawer-toggle" aria-hidden="true" />

      <div className="drawer-content flex flex-col">
        <header className="navbar border-b border-base-300 bg-base-100 md:hidden">
          <div className="btn btn-square btn-ghost h-11 w-11 animate-pulse bg-base-200" />
        </header>

        <div className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-7 sm:px-8 lg:px-10">
          <div className="mb-5 h-8 w-48 animate-pulse rounded bg-base-200" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="stat rounded-box min-h-[104px] animate-pulse border border-base-200 bg-base-100 px-4 py-3"
              >
                <div className="mb-2 h-3 w-20 rounded bg-base-200" />
                <div className="h-8 w-16 rounded bg-base-200" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="drawer-side z-40">
        <div className="min-h-full w-[288px] animate-pulse bg-base-200" />
      </div>
    </div>
  );
}
