import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';

const PosSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-110px)] animate-fadeIn">
            <div className="lg:col-span-2 flex flex-col h-full">
                <Card className="flex-shrink-0 mb-4 p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <Skeleton className="h-12 w-full rounded-lg" />
                        <Skeleton className="h-12 w-full rounded-lg" />
                    </div>
                </Card>
                <div className="flex-grow overflow-y-auto -m-2 p-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {[...Array(15)].map((_, i) => (
                            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                                <Skeleton className="w-full h-32" />
                                <div className="p-3 bg-white dark:bg-slate-800">
                                    <Skeleton className="h-4 w-full mb-2" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className="lg:col-span-1 flex flex-col h-full">
                 <Card className="flex-grow flex flex-col p-0">
                    <div className="p-6 pb-4"><Skeleton className="h-7 w-48 rounded-md"/></div>
                    <div className="flex-grow flex items-center justify-center p-6">
                        <div className="text-center">
                            <Skeleton className="w-16 h-16 mx-auto rounded-full mb-2"/>
                            <Skeleton className="h-4 w-24 rounded-md"/>
                        </div>
                    </div>
                 </Card>
            </div>
        </div>
    )
};

export default PosSkeleton;
