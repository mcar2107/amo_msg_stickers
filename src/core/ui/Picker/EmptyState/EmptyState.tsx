import type { FunctionComponent as FC } from 'preact';

import type { EmptyStateProps } from './EmptyState.types';

export const EmptyState: FC<EmptyStateProps> = (props) => {
  const { children, role } = props;

  return (
    <div
      role={role}
      className="px-4 py-10 text-center leading-normal text-cadetGray-30 dark:text-gray-70"
    >
      {children}
    </div>
  );
};
