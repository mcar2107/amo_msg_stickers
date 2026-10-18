import type { FunctionComponent as FC } from 'preact';

import { TabSvg } from '@ui/TabSvg';

export const SettingsIcon: FC = () => {
  return (
    <TabSvg>
      <path
        fillRule="evenodd"
        d="M4 6.1h9.2a2.5 2.5 0 0 1 4.6 0H20a.9.9 0 1 1 0 1.8h-2.2a2.5 2.5 0 0 1-4.6 0H4a.9.9 0 0 1 0-1.8Zm11.5.2a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4ZM4 16.1h2.2a2.5 2.5 0 0 1 4.6 0H20a.9.9 0 1 1 0 1.8h-9.2a2.5 2.5 0 0 1-4.6 0H4a.9.9 0 0 1 0-1.8Zm4.5.2a.7.7 0 1 0 0 1.4.7.7 0 0 0 0-1.4Z"
      />
    </TabSvg>
  );
};
