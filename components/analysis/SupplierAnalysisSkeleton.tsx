import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';
import TableSkeleton from '../ui/TableSkeleton';

const SupplierAnalysisSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            <Card title={<Skeleton className="h-6 w-40" />}>
                <div className="flex items-start gap-3 p-4">
                    <Skeleton className="w-6 h-6 rounded-md" />
                    <div className="w-full space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                </div>
            </Card>
            <Card title={<Skeleton className="h-6 w-48" />}>
                <TableSkeleton cols={4} rows={3} />
            </Card>
        </div>
    );
};
export default SupplierAnalysisSkeleton;
