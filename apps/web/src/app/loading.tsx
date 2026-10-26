/** Blocs d'attente à la forme d'une page type (titre, cartes d'indicateurs, tableau), qui tombent en cascade */
export default function Loading() {
  return (
    <div data-loading className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <div className="h-7 w-64 shimmer rounded-lg bg-gray-200 dark:bg-navy-light" />
          <div className="h-4 w-96 max-w-[70vw] shimmer rounded-md bg-gray-200/70 dark:bg-navy-light/70" />
        </div>
        <div className="h-10 w-36 shimmer rounded-xl bg-gray-200 dark:bg-navy-light" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 shimmer rounded-xl bg-gray-200 dark:bg-navy-light" />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-navy-light">
        <div className="h-11 border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-navy-dark/40" />
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="h-4 w-24 shimmer rounded bg-gray-200 dark:bg-navy" />
              <div className="h-4 flex-1 shimmer rounded bg-gray-200 dark:bg-navy" />
              <div className="h-5 w-20 shimmer rounded-full bg-gray-200 dark:bg-navy" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
