import { createBrowserRouter } from 'react-router-dom';

import {BrowserTopBar} from '@/features/browser/components/BrowserTopBar';
import StartPage from '@/features/start-page/startPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <BrowserTopBar />,
  },
  {
    path: '/start',
    element: <StartPage />,
  },
]);
