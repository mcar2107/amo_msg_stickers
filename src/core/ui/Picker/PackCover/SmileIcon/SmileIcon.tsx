import type { FunctionComponent as FC } from 'preact';

import { TabSvg } from '@ui/TabSvg';

export const SmileIcon: FC = () => {
  return (
    <TabSvg>
      <path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20Zm0 1.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4Zm-4.07 9.5a.9.9 0 0 1 1.23.3 3.3 3.3 0 0 0 5.68 0 .9.9 0 1 1 1.53.94 5.1 5.1 0 0 1-8.74 0 .9.9 0 0 1 .3-1.24ZM9 8.2a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm6 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z" />
    </TabSvg>
  );
};
