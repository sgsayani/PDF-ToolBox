import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Routes } from 'react-router-dom';

import { RequireAuth } from './components/auth/RequireAuth';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './hooks/useAuth';
import { WorkspaceDocumentProvider } from './hooks/useWorkspaceDocument';
import { SiteLayout } from './layouts/SiteLayout';
import {
  CSV_TO_PDF_CONFIG,
  EXCEL_TO_PDF_CONFIG,
  HTML_TO_PDF_CONFIG,
  POWERPOINT_TO_PDF_CONFIG,
  TEXT_TO_PDF_CONFIG,
} from './lib/convertToPdfConfigs';
import { AccountPage } from './pages/AccountPage';
import { ConvertToPdfPage } from './pages/ConvertToPdfPage';
import { ImagesToPdfPage } from './pages/ImagesToPdfPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { RemovePasswordPage } from './pages/RemovePasswordPage';
import { WordToPdfPage } from './pages/WordToPdfPage';
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
        <AuthProvider>
          <WorkspaceDocumentProvider>
            <Routes>
              <Route element={<SiteLayout />}>
                <Route index element={<LandingPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
              {/* These supply their own chrome. */}
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/images-to-pdf" element={<ImagesToPdfPage />} />
              <Route path="/word-to-pdf" element={<WordToPdfPage />} />
              <Route path="/excel-to-pdf" element={<ConvertToPdfPage config={EXCEL_TO_PDF_CONFIG} />} />
              <Route path="/csv-to-pdf" element={<ConvertToPdfPage config={CSV_TO_PDF_CONFIG} />} />
              <Route
                path="/powerpoint-to-pdf"
                element={<ConvertToPdfPage config={POWERPOINT_TO_PDF_CONFIG} />}
              />
              <Route path="/html-to-pdf" element={<ConvertToPdfPage config={HTML_TO_PDF_CONFIG} />} />
              <Route path="/text-to-pdf" element={<ConvertToPdfPage config={TEXT_TO_PDF_CONFIG} />} />
              <Route path="/remove-password" element={<RemovePasswordPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route
                path="/account"
                element={
                  <RequireAuth>
                    <AccountPage />
                  </RequireAuth>
                }
              />
            </Routes>
          </WorkspaceDocumentProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
