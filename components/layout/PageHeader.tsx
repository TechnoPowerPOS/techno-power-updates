
import React from 'react';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, children }) => {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-white tracking-tight leading-tight">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-slate-500 font-bold mt-2 text-sm md:text-base max-w-2xl">
                        {subtitle}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex shrink-0 gap-3 w-full md:w-auto">
                    {children}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
