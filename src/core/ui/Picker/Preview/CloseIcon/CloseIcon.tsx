import type { FunctionComponent as FC } from 'preact';

import { TabSvg } from '@ui/TabSvg';

export const CloseIcon: FC = () => {
  return (
    <TabSvg>
      <path d="M6.7 5.3 12 10.6l5.3-5.3a1 1 0 0 1 1.4 1.4L13.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4L12 13.4l-5.3 5.3a1 1 0 0 1-1.4-1.4l5.3-5.3-5.3-5.3a1 1 0 0 1 1.4-1.4Z" />
    </TabSvg>
  );
};
