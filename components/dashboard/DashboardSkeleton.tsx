import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-0 flex items-center overflow-hidden">
            <Skeleton className="w-16 h-full min-h-[88px]" />
            <div className="px-4 py-5 w-full">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-7 w-32" />
            </div>
          </Card>
        ))}
      </div>
      
      <Card title={<Skeleton className="h-6 w-48" />}>
        <Skeleton className="w-full h-[350px]" />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
             <Card title={<Skeleton className="h-6 w-40" />}>
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <div className="flex-grow">
                                <Skeleton className="h-4 w-2/3 mb-1" />
                                <Skeleton className="h-3 w-1/3" />
                            </div>
                            <Skeleton className="h-5 w-16" />
                        </div>
                    ))}
                </div>
             </Card>
        </div>
        <div className="lg:col-span-2">
           <Card title={<Skeleton className="h-6 w-48" />}>
               <Skeleton className="w-full h-[300px]" />
           </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
