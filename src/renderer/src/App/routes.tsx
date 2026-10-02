import { createBrowserRouter } from 'react-router-dom';

import {BrowserTopBar} from '@/features/browser/components/browser-top-bar';
import StartPage from '@/features/browser/pages/start-page/startPage';
import Overlay from '@/features/other/overlay/Overlay';

export const router = createBrowserRouter([
  {
    path: '/start',
    element: <StartPage />,
  },
  {
    path: '/browser',
    element: <BrowserTopBar />,
  },
  {
    path: "/overlay",
    element: <Overlay />
  }
]);
