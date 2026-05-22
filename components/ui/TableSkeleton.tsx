import React from 'react';
import Skeleton from './Skeleton';

const TableSkeleton: React.FC<{ rows?: number; cols: number, hasActions?: boolean }> = ({ rows = 5, cols, hasActions = false }) => {
  return (
    <div className="overflow-x-auto">
        <table className="w-full text-sm text-start">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50">
                <tr>
                    {[...Array(cols)].map((_, i) => (
                        <th key={i} scope="col" className="px-6 py-4">
                            <Skeleton className="h-4 w-24" />
                        </th>
                    ))}
                    {hasActions && (
                         <th scope="col" className="px-6 py-4 text-center">
                            <Skeleton className="h-4 w-20 mx-auto" />
                        </th>
                    )}
                </tr>
            </thead>
            <tbody>
                {[...Array(rows)].map((_, i) => (
                    <tr key={i} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800">
                        {[...Array(cols)].map((_, j) => (
                            <td key={j} className="px-6 py-4">
                                <Skeleton className="h-5 w-full" />
                            </td>
                        ))}
                         {hasActions && (
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-x-2">
                                    <Skeleton className="h-7 w-7 rounded-md" />
                                    <Skeleton className="h-7 w-7 rounded-md" />
                                </div>
                            </td>
                         )}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  );
};

export default TableSkeleton;
