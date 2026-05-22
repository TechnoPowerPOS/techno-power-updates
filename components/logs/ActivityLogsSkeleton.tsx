import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

const ActivityLogsSkeleton: React.FC = () => {
    return (
        <Card>
            <div className="mb-4">
                <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <ul className="space-y-4">
                {[...Array(5)].map((_, i) => (
                    <li key={i} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <Skeleton className="w-10 h-10 rounded-full" />
                        <div className="flex-grow">
                            <Skeleton className="h-5 w-1/3 mb-2" />
                            <Skeleton className="h-4 w-2/3 mb-3" />
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-3 w-20" />
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
};
export default ActivityLogsSkeleton;
