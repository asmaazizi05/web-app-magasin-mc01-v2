import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  rowClassName?: (row: T) => string;
  empty?: ReactNode;
  /** `uppercase` reproduit les en-têtes de la maquette ; `compact` réduit le padding */
  dense?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, rowClassName, empty, dense = false }: DataTableProps<T>) {
  const tr = useT();
  const cell = dense ? 'p-2' : 'p-3';
  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs">
        <thead className="bg-gray-100 font-semibold uppercase text-gray-600 dark:bg-navy-dark dark:text-gray-400">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`${cell} whitespace-nowrap`}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-6 text-center text-gray-500 dark:text-gray-400">
                {empty ?? tr('Aucune donnée.')}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className={rowClassName?.(row) ?? ''}>
                {columns.map((c) => (
                  <td key={c.key} className={`${cell} ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
