import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';

import { ToastProvider } from './components/ui/Toast';
import { WorkspaceDocumentProvider } from './hooks/useWorkspaceDocument';
import { SiteLayout } from './layouts/SiteLayout';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { WorkspacePage } from './pages/WorkspacePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // File processing is one-shot; nothing here benefits from refetching.
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: { retry: false },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <WorkspaceDocumentProvider>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<LandingPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
            {/* The workspace supplies its own chrome. */}
            <Route path="/workspace" element={<WorkspacePage />} />
          </Routes>
        </WorkspaceDocumentProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
