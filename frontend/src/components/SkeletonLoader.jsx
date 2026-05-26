import React from 'react';

export const ShimmerUI = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}></div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-start">
        <ShimmerUI className="h-6 w-3/4" />
        <ShimmerUI className="h-6 w-16 rounded-full" />
      </div>
      <ShimmerUI className="h-4 w-full" />
      <ShimmerUI className="h-4 w-5/6" />
      <div className="flex justify-between items-center mt-4">
        <ShimmerUI className="h-8 w-24 rounded-md" />
        <ShimmerUI className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
};

export const DashboardWidgetSkeleton = () => {
  return (
    <div className="p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <ShimmerUI className="h-12 w-12 rounded-full" />
        <div>
          <ShimmerUI className="h-4 w-24 mb-2" />
          <ShimmerUI className="h-8 w-16" />
        </div>
      </div>
      <ShimmerUI className="h-2 w-full mt-4" />
    </div>
  );
};

export const PageLoader = () => {
  return (
    <div className="w-full h-full min-h-[50vh] flex flex-col justify-center items-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      <p className="text-gray-500 text-sm">Loading...</p>
    </div>
  );
};
