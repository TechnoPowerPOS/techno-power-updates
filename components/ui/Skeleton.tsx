import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-700 rounded-md animate-pulse ${className}`}
      {...props}
    />
  );
};

export default Skeleton;
