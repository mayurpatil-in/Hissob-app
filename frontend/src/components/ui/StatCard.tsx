import React from 'react';
import { Spin } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

export interface StatCardProps {
  title: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  color?: 'navy' | 'orange' | 'blue' | 'green' | 'gold';
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  color = 'orange',
  trend,
  subtitle,
  loading = false,
  onClick,
  className = '',
  style,
}) => {
  return (
    <div
      className={`hissob-stat-card-v2 ${onClick ? 'clickable' : ''} ${className}`}
      style={{ cursor: onClick ? 'pointer' : 'default', ...style }}
      onClick={onClick}
    >
      <div>
        <div className="hissob-stat-card-header">
          <span className="hissob-stat-card-title">{title}</span>
          {icon && <div className={`hissob-stat-card-icon-wrapper ${color}`}>{icon}</div>}
        </div>

        {loading ? (
          <div style={{ padding: '8px 0' }}>
            <Spin size="small" />
          </div>
        ) : (
          <div className="hissob-stat-card-value">{value}</div>
        )}
      </div>

      {(trend || subtitle) && (
        <div className="hissob-stat-card-footer">
          {trend && (
            <span className={`hissob-stat-badge ${trend.isPositive !== false ? 'positive' : 'negative'}`}>
              {trend.isPositive !== false ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              {trend.value}
            </span>
          )}
          {(trend?.label || subtitle) && (
            <span className="hissob-stat-card-subtext">
              {trend?.label || subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
