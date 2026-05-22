import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

const CctvSkeleton: React.FC = () => {
    return (
        <div className="animate-pulse">
            <div className="text-center mb-10">
                <Skeleton className="h-10 w-64 mx-auto mb-4 rounded-md" />
                <Skeleton className="h-5 w-96 mx-auto rounded-md" />
            </div>

            <Card className="mb-8">
                <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-lg" />
                    <div className="flex-grow space-y-2">
                        <Skeleton className="h-5 w-48 rounded-md" />
                        <Skeleton className="h-4 w-full rounded-md" />
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="aspect-video rounded-xl" />
                <Skeleton className="aspect-video rounded-xl" />
            </div>
        </div>
    );
};

export default CctvSkeleton;