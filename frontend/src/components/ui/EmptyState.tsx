import React from 'react';
import { InboxOutlined } from '@ant-design/icons';

export interface EmptyStateProps {
  title?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  actionButton?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Data Available',
  description = 'There are currently no records to display.',
  icon = <InboxOutlined />,
  actionButton,
  className = '',
  style,
}) => {
  return (
    <div className={`hissob-empty-state ${className}`} style={style}>
      <div className="hissob-empty-icon">{icon}</div>
      <div className="hissob-empty-title">{title}</div>
      <div className="hissob-empty-desc">{description}</div>
      {actionButton && <div>{actionButton}</div>}
    </div>
  );
};

export default EmptyState;
