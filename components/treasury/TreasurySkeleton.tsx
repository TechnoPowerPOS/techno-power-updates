import React from 'react';
import Skeleton from '../ui/Skeleton';
import Card from '../ui/Card';
import TableSkeleton from '../ui/TableSkeleton';

const TreasurySkeleton: React.FC = () => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} title={<Skeleton className="h-6 w-32" />}>
            <Skeleton className="h-8 w-48" />
          </Card>
        ))}
      </div>
      <Card>
        <TableSkeleton cols={6} hasActions />
      </Card>
    </>
  );
};

export default TreasurySkeleton;
