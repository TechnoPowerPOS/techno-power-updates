import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

const SalesForecastSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card title={<Skeleton className="h-6 w-48" />}>
                    <Skeleton className="w-full h-[300px]" />
                </Card>
            </div>
            <div className="space-y-6">
                <Card title={<Skeleton className="h-6 w-48" />}>
                    <div className="flex items-start gap-3">
                        <Skeleton className="w-6 h-6 rounded-md" />
                        <div className="w-full space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </Card>
                <Card title={<Skeleton className="h-6 w-40" />}>
                     <div className="flex items-start gap-3">
                        <Skeleton className="w-6 h-6 rounded-md" />
                        <div className="w-full space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
export default SalesForecastSkeleton;
