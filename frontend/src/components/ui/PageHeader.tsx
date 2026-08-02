import React from 'react';
import { Breadcrumb, Tag } from 'antd';
import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  title: React.ReactNode;
  path?: string;
}

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  tag?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  extra?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  icon,
  tag,
  breadcrumbs,
  extra,
  className = '',
  style,
}) => {
  return (
    <div className={`hissob-page-header ${className}`} style={style}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb style={{ marginBottom: 6, fontSize: 12 }}>
          {breadcrumbs.map((item, index) => (
            <Breadcrumb.Item key={index}>
              {item.path ? <Link to={item.path}>{item.title}</Link> : item.title}
            </Breadcrumb.Item>
          ))}
        </Breadcrumb>
      )}

      <div className="hissob-page-header-top">
        <div className="hissob-page-header-main">
          {icon && <div className="hissob-page-header-icon">{icon}</div>}
          <div>
            <div className="hissob-page-header-title-row">
              <h1 className="hissob-page-header-title">{title}</h1>
              {tag && (typeof tag === 'string' ? <Tag color="orange">{tag}</Tag> : tag)}
            </div>
            {subtitle && <p className="hissob-page-header-subtitle">{subtitle}</p>}
          </div>
        </div>

        {extra && <div className="hissob-page-header-extra">{extra}</div>}
      </div>
    </div>
  );
};

export default PageHeader;
