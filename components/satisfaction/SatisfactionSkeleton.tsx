import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

const SatisfactionSkeleton: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="flex items-center gap-4">
                        <Skeleton className="p-3 h-12 w-12 rounded-lg" />
                        <div className="w-full">
                           <Skeleton className="h-4 w-24 mb-2" />
                           <Skeleton className="h-6 w-16" />
                        </div>
                    </Card>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title={<Skeleton className="h-6 w-48" />} className="lg:col-span-2">
                    <Skeleton className="w-full h-[350px]" />
                </Card>
                <div className="space-y-6">
                    <Card>
                        <Skeleton className="h-4 w-32 mx-auto mb-2" />
                        <Skeleton className="h-12 w-40 mx-auto my-2" />
                        <Skeleton className="h-2.5 w-full rounded-full" />
                    </Card>
                    <Card title={<Skeleton className="h-6 w-40" />}>
                        <div className="flex items-start gap-3">
                            <Skeleton className="w-5 h-5 rounded-full" />
                            <div className="w-full">
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-full mb-2" />
                                <Skeleton className="h-4 w-2/3" />
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
export default SatisfactionSkeleton;
