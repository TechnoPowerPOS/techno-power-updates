import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';
import TableSkeleton from '../ui/TableSkeleton';

const EmployeePerformanceSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="flex items-center gap-4">
                        <Skeleton className="p-3 h-12 w-12 rounded-lg" />
                        <div className="w-full">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-6 w-32" />
                        </div>
                    </Card>
                ))}
            </div>
            <Card title={<Skeleton className="h-6 w-48" />}>
                <Skeleton className="w-full h-[350px]" />
            </Card>
            <Card title={<Skeleton className="h-6 w-56" />}>
                <TableSkeleton cols={6} />
            </Card>
        </div>
    );
};
export default EmployeePerformanceSkeleton;
