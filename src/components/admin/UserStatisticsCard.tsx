'use client';

import React from 'react';

interface UserStatisticsCardProps {
  title: string;
  value: number;
  icon: string;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function UserStatisticsCard({
  title,
  value,
  icon,
  color,
  subtitle,
  trend
}: UserStatisticsCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={`text-sm font-medium ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${color}`}>
          <span className="text-2xl text-white">{icon}</span>
        </div>
      </div>
    </div>
  );
}