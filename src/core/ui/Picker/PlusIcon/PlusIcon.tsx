import type { FunctionComponent as FC } from 'preact';

import { TabSvg } from '@ui/TabSvg';

export const PlusIcon: FC = () => {
  return (
    <TabSvg>
      <path d="M12 4c.5 0 .9.4.9.9v6.2h6.2a.9.9 0 1 1 0 1.8h-6.2v6.2a.9.9 0 1 1-1.8 0v-6.2H4.9a.9.9 0 1 1 0-1.8h6.2V4.9c0-.5.4-.9.9-.9Z" />
    </TabSvg>
  );
};
