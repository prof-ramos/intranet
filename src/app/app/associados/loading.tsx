export default function AssociadosLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 lg:px-10">
      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="h-10 w-36 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
          <div className="h-5 w-72 max-w-full rounded bg-[#f8fafc] motion-safe:animate-pulse" />
        </div>
        <div className="h-11 w-32 rounded-[8px] bg-[#f8fafc] motion-safe:animate-pulse" />
      </div>

      <div className="mb-6 space-y-2">
        <div className="h-5 w-32 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
        <div className="h-12 rounded-[8px] bg-[#f8fafc] motion-safe:animate-pulse" />
        <div className="h-4 w-44 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-[8px] border border-[rgba(4,9,32,0.08)] bg-white p-4">
            <div className="h-5 w-2/3 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
            <div className="mt-2 h-4 w-1/2 rounded bg-[#f8fafc] motion-safe:animate-pulse" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-20 rounded-full bg-[#f8fafc] motion-safe:animate-pulse" />
              <div className="h-6 w-24 rounded-full bg-[#f8fafc] motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
        </div>
    </div>
  );
}
