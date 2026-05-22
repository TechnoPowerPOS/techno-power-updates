import React from 'react';
import Skeleton from '../ui/Skeleton';

const ProductTableSkeleton: React.FC = () => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-start">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-800/50">
                    <tr>
                        <th scope="col" className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
                        <th scope="col" className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
                        <th scope="col" className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
                        <th scope="col" className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
                        <th scope="col" className="px-6 py-4"><Skeleton className="h-4 w-24" /></th>
                        <th scope="col" className="px-6 py-4 text-center"><Skeleton className="h-4 w-20 mx-auto" /></th>
                    </tr>
                </thead>
                <tbody>
                    {[...Array(5)].map((_, i) => (
                        <tr key={i} className="bg-white border-b dark:bg-slate-900 dark:border-slate-800">
                            <td className="px-6 py-4 font-medium flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-md" />
                                <Skeleton className="h-5 w-32" />
                            </td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-28" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-12" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>
                            <td className="px-6 py-4 text-center">
                                <div className="flex justify-center gap-x-2">
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                    <Skeleton className="h-8 w-8 rounded-full" />
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ProductTableSkeleton;
