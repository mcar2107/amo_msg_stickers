import type { FunctionComponent as FC } from 'preact';

import { TabSvg } from '@ui/TabSvg';

export const ClockIcon: FC = () => {
  return (
    <TabSvg>
      <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Zm0 2.7c.5 0 .9.4.9.9v4.23l2.74 2.74a.9.9 0 1 1-1.28 1.27l-3-3a.9.9 0 0 1-.26-.64V7.4c0-.5.4-.9.9-.9Z" />
    </TabSvg>
  );
};
