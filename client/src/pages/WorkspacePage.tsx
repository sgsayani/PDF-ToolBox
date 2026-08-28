import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FileWarning, ShieldCheck } from 'lucide-react';

import { MergeFileList } from '../components/workspace/MergeFileList';
import { MergePanel } from '../components/workspace/MergePanel';
import { MetadataPanel } from '../components/workspace/MetadataPanel';
import { OrganizePanel } from '../components/workspace/OrganizePanel';
import { PageGrid } from '../components/workspace/PageGrid';
import { PageGridSection } from '../components/workspace/PageGridSection';
import { PageNumbersPanel, type PageNumbersFormState } from '../components/workspace/PageNumbersPanel';
import { PageToolbar } from '../components/workspace/PageToolbar';
import { ProtectPanel } from '../components/workspace/ProtectPanel';
import { ResultDialog } from '../components/workspace/ResultDialog';
import { SignPanel, type SignFormState } from '../components/workspace/SignPanel';
import { SplitPanel, type SplitMode } from '../components/workspace/SplitPanel';
import { ToolRail } from '../components/workspace/ToolRail';
import { WatermarkPanel, type WatermarkFormState } from '../components/workspace/WatermarkPanel';
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader';
import { UploadTaskRow } from '../components/upload/UploadTaskRow';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { useToast } from '../components/ui/Toast';
import { useLimits } from '../hooks/useLimits';
import { usePageSelection } from '../hooks/usePageSelection';
import { usePdfPreview } from '../hooks/usePdfPreview';
import { useHistoryState } from '../hooks/useHistoryState';
import { useUploadQueue } from '../hooks/useUploadQueue';
import { useWorkspaceDocument } from '../hooks/useWorkspaceDocument';
import { cn } from '../lib/cn';
import { createDrafts, isPristine } from '../lib/pages';
import { formatBytes, formatFileCount, formatPageCount } from '../lib/format';
import { AVAILABLE_TOOLS } from '../lib/tools';
import { ApiError } from '../services/apiClient';
import { pdfApi } from '../services/pdfApi';
import type {
  ApiFile,
  MergeCandidate,
  OperationResponse,
  PageDraft,
  PageTarget,
  UploadResponse,
  WorkspaceDocument,
  WorkspaceTool,
} from '../types';

/** Normalises a rotation to 0/90/180/270. */
function turn(rotation: number, direction: 'cw' | 'ccw'): number {
  const next = rotation + (direction === 'cw' ? 90 : -90);
  return ((next % 360) + 360) % 360;
}

/** Tools whose main content is the editable Organize/Split page grid, unchanged from Phase 1. */
const DRAFT_GRID_TOOLS = new Set<WorkspaceTool>(['organize', 'split']);
/** Tools that only need to know *which* pages to target, via a read-only grid. */
const TARGET_GRID_TOOLS = new Set<WorkspaceTool>(['watermark', 'page-numbers', 'sign']);

export function WorkspacePage() {
  const { document } = useWorkspaceDocument();

  // Nothing to work on — most likely a direct visit or a page refresh.
  if (!document) return <Navigate to="/" replace />;

  // Keyed on the file id so opening a result starts from a clean slate:
  // no stale plan, selection or history from the previous document.
  return <Workspace key={document.fileId} document={document} />;
}

function Workspace({ document }: { document: WorkspaceDocument }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { open, close } = useWorkspaceDocument();
  const limits = useLimits();

  const { preview, status: previewStatus } = usePdfPreview(document.blob);

  const [tool, setTool] = useState<WorkspaceTool>('organize');
  const [splitMode, setSplitMode] = useState<SplitMode>('selection');
  const [result, setResult] = useState<ApiFile | null>(null);
  const [resultTool, setResultTool] = useState<WorkspaceTool | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const plan = useHistoryState<PageDraft[]>(() => createDrafts(document.pageCount));
  const drafts = plan.state;
  const selection = usePageSelection(drafts);

  const hasChanges = !isPristine(drafts, document.pageCount);

  const [mergeEntries, setMergeEntries] = useState<MergeCandidate[]>(() => [
    {
      localId: 'open-document',
      fileId: document.fileId,
      filename: document.filename,
      size: document.size,
      pageCount: document.pageCount,
    },
  ]);

  // ------------------------------------------------------- Phase 2 tool state

  // Watermark, page-numbers and signature placement only need to know *which*
  // pages to target, never to reorder/rotate/delete them — so they get their
  // own static, always-in-original-order draft list and their own selection,
  // entirely independent of Organize/Split's editable `plan` above.
  const targetDrafts = useMemo(() => createDrafts(document.pageCount), [document.pageCount]);
  const targetSelection = usePageSelection(targetDrafts);

  const [watermarkForm, setWatermarkForm] = useState<WatermarkFormState>({
    text: '',
    position: 'center',
    opacity: 0.3,
    fontSize: 48,
    applyTo: 'all',
  });
  const updateWatermarkForm = useCallback(
    (patch: Partial<WatermarkFormState>) => setWatermarkForm((current) => ({ ...current, ...patch })),
    [],
  );

  const [pageNumbersForm, setPageNumbersForm] = useState<PageNumbersFormState>({
    position: 'bottom-center',
    startNumber: 1,
    applyTo: 'all',
  });
  const updatePageNumbersForm = useCallback(
    (patch: Partial<PageNumbersFormState>) =>
      setPageNumbersForm((current) => ({ ...current, ...patch })),
    [],
  );

  const [signForm, setSignForm] = useState<SignFormState>({
    position: 'bottom-right',
    widthPercent: 30,
    image: null,
  });
  const updateSignForm = useCallback(
    (patch: Partial<SignFormState>) => setSignForm((current) => ({ ...current, ...patch })),
    [],
  );

  const [protectPassword, setProtectPassword] = useState<string | null>(null);

  const metadataQuery = useQuery({
    queryKey: ['metadata', document.fileId],
    queryFn: () => pdfApi.metadata(document.fileId),
    enabled: tool === 'metadata',
    staleTime: 60_000,
  });

  // ---------------------------------------------------------------- mutations

  const handleSuccess = useCallback((response: OperationResponse, sourceTool: WorkspaceTool) => {
    setResult(response.file);
    setResultTool(sourceTool);
  }, []);

  const handleError = useCallback(
    (error: unknown) => {
      const message =
        error instanceof ApiError
          ? error.message
          : "We couldn't process this PDF. Please try again.";
      toast.error('Processing failed', message);
    },
    [toast],
  );

  const organizeMutation = useMutation({
    mutationFn: (pages: PageDraft[]) => pdfApi.organize(document.fileId, pages),
    onSuccess: (response) => handleSuccess(response, 'organize'),
    onError: handleError,
  });

  const splitMutation = useMutation({
    mutationFn: (pages: PageDraft[]) => pdfApi.split(document.fileId, pages),
    onSuccess: (response) => handleSuccess(response, 'split'),
    onError: handleError,
  });

  const mergeMutation = useMutation({
    mutationFn: (fileIds: string[]) => pdfApi.merge(fileIds),
    onSuccess: (response) => handleSuccess(response, 'merge'),
    onError: handleError,
  });

  const watermarkMutation = useMutation({
    mutationFn: (input: {
      text: string;
      position: WatermarkFormState['position'];
      opacity: number;
      fontSize: number;
      pages: PageTarget;
    }) => pdfApi.watermark(document.fileId, input),
    onSuccess: (response) => handleSuccess(response, 'watermark'),
    onError: handleError,
  });

  const pageNumbersMutation = useMutation({
    mutationFn: (input: {
      position: PageNumbersFormState['position'];
      startNumber: number;
      pages: PageTarget;
    }) => pdfApi.pageNumbers(document.fileId, input),
    onSuccess: (response) => handleSuccess(response, 'page-numbers'),
    onError: handleError,
  });

  const removeMetadataMutation = useMutation({
    mutationFn: () => pdfApi.removeMetadata(document.fileId),
    onSuccess: (response) => handleSuccess(response, 'metadata'),
    onError: handleError,
  });

  const signMutation = useMutation({
    mutationFn: (input: {
      page: number;
      position: SignFormState['position'];
      widthPercent: number;
      image: string;
    }) => pdfApi.sign(document.fileId, input),
    onSuccess: (response) => handleSuccess(response, 'sign'),
    onError: handleError,
  });

  const protectMutation = useMutation({
    mutationFn: (password: string) => pdfApi.protect(document.fileId, password),
    onSuccess: (response) => handleSuccess(response, 'protect'),
    onError: handleError,
  });

  const isProcessing =
    organizeMutation.isPending ||
    splitMutation.isPending ||
    mergeMutation.isPending ||
    watermarkMutation.isPending ||
    pageNumbersMutation.isPending ||
    removeMetadataMutation.isPending ||
    signMutation.isPending ||
    protectMutation.isPending;

  // ------------------------------------------------------------------ uploads

  const mergeUploads = useUploadQueue({
    maxFileSizeBytes: limits.maxFileSizeBytes,
    onUploaded: useCallback((response: UploadResponse) => {
      setMergeEntries((current) => [
        ...current,
        {
          localId: `merge-${response.file.id}`,
          fileId: response.file.id,
          filename: response.file.filename,
          size: response.file.size,
          pageCount: response.file.pageCount,
        },
      ]);
    }, []),
    onFailed: useCallback(
      (message: string) => toast.error('Could not add file', message),
      [toast],
    ),
  });

  // ------------------------------------------------------------ page editing

  const rotatePages = useCallback(
    (keys: ReadonlySet<string>, direction: 'cw' | 'ccw') => {
      plan.set((current) =>
        current.map((draft) =>
          keys.has(draft.key) ? { ...draft, rotation: turn(draft.rotation, direction) } : draft,
        ),
      );
    },
    [plan],
  );

  const deletePages = useCallback(
    (keys: ReadonlySet<string>) => {
      if (keys.size >= drafts.length) {
        toast.error(
          'A PDF needs at least one page',
          'Keep one page, or start over with a different file.',
        );
        return;
      }

      plan.set((current) => current.filter((draft) => !keys.has(draft.key)));
      selection.replace([...selection.selectedKeys].filter((key) => !keys.has(key)));
    },
    [drafts.length, plan, selection, toast],
  );

  const handleSelect = useCallback(
    (draft: PageDraft, modifiers: { shift: boolean; toggle: boolean }) => {
      // Clicking a page is a clear signal the user wants to pick pages by hand.
      if (tool === 'split' && splitMode === 'range') setSplitMode('selection');
      selection.select(draft, modifiers);
    },
    [selection, splitMode, tool],
  );

  /** Range mode drives the selection so the grid always shows what will be extracted. */
  const handleRangeChange = useCallback(
    (pages: number[]) => {
      const wanted = new Set(pages);
      selection.replace(
        drafts.filter((draft) => wanted.has(draft.source)).map((draft) => draft.key),
      );
    },
    [drafts, selection],
  );

  // -------------------------------------------------------------- shortcuts

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Never hijack typing.
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (isProcessing || result) return;

      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        if (DRAFT_GRID_TOOLS.has(tool)) selection.selectAll();
        else if (TARGET_GRID_TOOLS.has(tool)) targetSelection.selectAll();
        return;
      }
      if (meta && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) plan.redo();
        else plan.undo();
        return;
      }
      if (event.key === 'Escape') {
        selection.clear();
        targetSelection.clear();
        return;
      }
      if (
        tool === 'organize' &&
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selection.selectedKeys.size > 0
      ) {
        event.preventDefault();
        deletePages(selection.selectedKeys);
      }
    };

    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [deletePages, isProcessing, plan, result, selection, targetSelection, tool]);

  // ------------------------------------------------------------ primary action

  const primary = useMemo(() => {
    switch (tool) {
      case 'organize':
        return {
          label: 'Save as new PDF',
          disabled: !hasChanges || previewStatus === 'error',
          loading: organizeMutation.isPending,
          run: () => organizeMutation.mutate(drafts),
        };
      case 'split': {
        const count = selection.selectedDrafts.length;
        return {
          label: count > 0 ? `Extract ${formatPageCount(count)}` : 'Extract pages',
          disabled: count === 0,
          loading: splitMutation.isPending,
          run: () => splitMutation.mutate(selection.selectedDrafts),
        };
      }
      case 'merge':
        return {
          label:
            mergeEntries.length >= 2 ? `Merge ${formatFileCount(mergeEntries.length)}` : 'Merge PDFs',
          disabled: mergeEntries.length < 2 || mergeUploads.isUploading,
          loading: mergeMutation.isPending,
          run: () => mergeMutation.mutate(mergeEntries.map((entry) => entry.fileId)),
        };
      case 'watermark': {
        const noSelection = watermarkForm.applyTo === 'selected' && targetSelection.selectedKeys.size === 0;
        return {
          label: 'Add watermark',
          disabled: watermarkForm.text.trim().length === 0 || noSelection,
          loading: watermarkMutation.isPending,
          run: () =>
            watermarkMutation.mutate({
              text: watermarkForm.text.trim(),
              position: watermarkForm.position,
              opacity: watermarkForm.opacity,
              fontSize: watermarkForm.fontSize,
              pages:
                watermarkForm.applyTo === 'all'
                  ? 'all'
                  : targetSelection.selectedDrafts.map((draft) => draft.source),
            }),
        };
      }
      case 'page-numbers': {
        const noSelection =
          pageNumbersForm.applyTo === 'selected' && targetSelection.selectedKeys.size === 0;
        return {
          label: 'Add page numbers',
          disabled: noSelection,
          loading: pageNumbersMutation.isPending,
          run: () =>
            pageNumbersMutation.mutate({
              position: pageNumbersForm.position,
              startNumber: pageNumbersForm.startNumber,
              pages:
                pageNumbersForm.applyTo === 'all'
                  ? 'all'
                  : targetSelection.selectedDrafts.map((draft) => draft.source),
            }),
        };
      }
      case 'metadata':
        return {
          label: 'Remove metadata',
          disabled: metadataQuery.isLoading,
          loading: removeMetadataMutation.isPending,
          run: () => removeMetadataMutation.mutate(),
        };
      case 'sign': {
        const target = targetSelection.selectedDrafts[0];
        return {
          label: 'Add signature',
          disabled: !signForm.image || targetSelection.selectedKeys.size !== 1,
          loading: signMutation.isPending,
          run: () => {
            if (!signForm.image || !target) return;
            signMutation.mutate({
              page: target.source,
              position: signForm.position,
              widthPercent: signForm.widthPercent,
              image: signForm.image,
            });
          },
        };
      }
      case 'protect':
        return {
          label: 'Protect PDF',
          disabled: protectPassword === null,
          loading: protectMutation.isPending,
          run: () => {
            if (protectPassword !== null) protectMutation.mutate(protectPassword);
          },
        };
    }
  }, [
    drafts,
    hasChanges,
    mergeEntries,
    mergeMutation,
    mergeUploads.isUploading,
    metadataQuery.isLoading,
    organizeMutation,
    pageNumbersForm,
    pageNumbersMutation,
    previewStatus,
    protectMutation,
    protectPassword,
    removeMetadataMutation,
    selection.selectedDrafts,
    signForm,
    signMutation,
    splitMutation,
    targetSelection.selectedDrafts,
    targetSelection.selectedKeys.size,
    tool,
    watermarkForm,
    watermarkMutation,
  ]);

  // ------------------------------------------------------------------ exiting

  const leave = useCallback(() => {
    close();
    void navigate('/');
  }, [close, navigate]);

  const handleExit = useCallback(() => {
    if (hasChanges) setConfirmExit(true);
    else leave();
  }, [hasChanges, leave]);

  const closeResult = useCallback(() => {
    setResult(null);
    setResultTool(null);
  }, []);

  const handleContinueEditing = useCallback(async () => {
    if (!result) return;
    setContinuing(true);

    try {
      const blob = await pdfApi.fetchBlob(result);

      open({
        fileId: result.id,
        filename: result.filename,
        size: result.size,
        pageCount: result.pageCount,
        expiresAt: result.expiresAt,
        blob,
      });
      closeResult();
    } catch {
      toast.error(
        'Could not open the result',
        'The file is still available to download. Please try downloading it instead.',
      );
    } finally {
      setContinuing(false);
    }
  }, [closeResult, open, result, toast]);

  // ------------------------------------------------------------------- render

  const toolPanel =
    tool === 'organize' ? (
      <OrganizePanel
        drafts={drafts}
        originalPageCount={document.pageCount}
        hasChanges={hasChanges}
        disabled={isProcessing}
        onReset={() => setConfirmDiscard(true)}
      />
    ) : tool === 'split' ? (
      <SplitPanel
        mode={splitMode}
        onModeChange={setSplitMode}
        pageCount={drafts.length}
        pages={selection.selectedDrafts.map((draft) => draft.source)}
        onRangeChange={handleRangeChange}
        disabled={isProcessing}
      />
    ) : tool === 'merge' ? (
      <MergePanel
        entries={mergeEntries}
        maxFiles={limits.maxFilesPerRequest}
        maxFileSizeBytes={limits.maxFileSizeBytes}
        disabled={isProcessing}
        onFiles={mergeUploads.enqueue}
      />
    ) : tool === 'watermark' ? (
      <WatermarkPanel
        value={watermarkForm}
        onChange={updateWatermarkForm}
        totalPages={targetDrafts.length}
        selectedCount={targetSelection.selectedKeys.size}
        disabled={isProcessing}
      />
    ) : tool === 'page-numbers' ? (
      <PageNumbersPanel
        value={pageNumbersForm}
        onChange={updatePageNumbersForm}
        totalPages={targetDrafts.length}
        selectedCount={targetSelection.selectedKeys.size}
        disabled={isProcessing}
      />
    ) : tool === 'metadata' ? (
      <MetadataPanel
        metadata={metadataQuery.data?.metadata}
        isLoading={metadataQuery.isLoading}
        isError={metadataQuery.isError}
      />
    ) : tool === 'sign' ? (
      <SignPanel
        value={signForm}
        onChange={updateSignForm}
        selectedCount={targetSelection.selectedKeys.size}
        disabled={isProcessing}
      />
    ) : (
      <ProtectPanel onPasswordReady={setProtectPassword} disabled={isProcessing} />
    );

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <WorkspaceHeader
        filename={document.filename}
        pageCount={drafts.length}
        size={document.size}
        primaryLabel={primary.label}
        primaryDisabled={primary.disabled || isProcessing}
        primaryLoading={primary.loading}
        onPrimary={primary.run}
        onExit={handleExit}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="shrink-0 border-b border-line bg-surface lg:sticky lg:top-15 lg:flex lg:h-[calc(100dvh-3.75rem)] lg:w-66 lg:flex-col lg:border-r lg:border-b-0">
          {/* Compact tool switcher for narrow screens. */}
          <div className="flex gap-1 overflow-x-auto px-3 py-2.5 lg:hidden">
            {AVAILABLE_TOOLS.map((definition) => {
              const Icon = definition.icon;
              const isActive = definition.tool === tool;
              return (
                <button
                  key={definition.id}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => definition.tool && setTool(definition.tool)}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50',
                    isActive ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-raised',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {definition.name}
                </button>
              );
            })}
          </div>

          <div className="border-t border-line px-4 py-4 lg:border-t-0 lg:border-b lg:px-3">
            {toolPanel}
          </div>

          <div className="hidden min-h-0 flex-1 overflow-y-auto px-3 py-4 lg:block">
            <ToolRail active={tool} onSelect={setTool} disabled={isProcessing} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {DRAFT_GRID_TOOLS.has(tool) ? (
            <>
              <PageToolbar
                totalPages={drafts.length}
                selectedCount={selection.selectedKeys.size}
                disabled={isProcessing}
                editable={tool === 'organize'}
                canUndo={plan.canUndo}
                canRedo={plan.canRedo}
                onSelectAll={selection.selectAll}
                onClearSelection={selection.clear}
                onRotateSelected={(direction) => rotatePages(selection.selectedKeys, direction)}
                onDeleteSelected={() => deletePages(selection.selectedKeys)}
                onUndo={plan.undo}
                onRedo={plan.redo}
              />

              <div className="p-4 sm:p-6">
                {previewStatus === 'error' ? (
                  <EmptyState
                    icon={<FileWarning />}
                    title="We couldn’t render a preview"
                    description="The document may use features our preview doesn’t support. You can still start over with a different file."
                    action={
                      <Button variant="secondary" onClick={leave}>
                        Choose another PDF
                      </Button>
                    }
                  />
                ) : previewStatus === 'loading' ? (
                  <ul
                    aria-label="Loading pages"
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                  >
                    {Array.from({ length: Math.min(document.pageCount, 12) }, (_, index) => (
                      <li key={index}>
                        <Skeleton className="aspect-[4/5.35] w-full" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <PageGrid
                    drafts={drafts}
                    selected={selection.selectedKeys}
                    preview={preview}
                    disabled={isProcessing}
                    sortable={tool === 'organize'}
                    onReorder={plan.set}
                    onSelect={handleSelect}
                    onRotate={(draft, direction) => rotatePages(new Set([draft.key]), direction)}
                    onDelete={(draft) => deletePages(new Set([draft.key]))}
                  />
                )}
              </div>
            </>
          ) : TARGET_GRID_TOOLS.has(tool) ? (
            <PageGridSection
              drafts={targetDrafts}
              selected={targetSelection.selectedKeys}
              preview={preview}
              previewStatus={previewStatus}
              disabled={isProcessing}
              onSelect={targetSelection.select}
              onSelectAll={targetSelection.selectAll}
              onClearSelection={targetSelection.clear}
              onPreviewError={leave}
            />
          ) : tool === 'merge' ? (
            <div className="mx-auto max-w-2xl p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-[15px] font-semibold text-ink">Files to merge</h2>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                  They will be combined top to bottom. Drag a file to change its position.
                </p>
              </div>

              <MergeFileList
                entries={mergeEntries}
                disabled={isProcessing}
                pinnedId="open-document"
                onReorder={setMergeEntries}
                onRemove={(localId) => {
                  const entry = mergeEntries.find((item) => item.localId === localId);
                  setMergeEntries((current) =>
                    current.filter((item) => item.localId !== localId),
                  );
                  if (entry) void pdfApi.release(entry.fileId);
                }}
              />

              {mergeUploads.tasks.filter((task) => task.status !== 'succeeded').length > 0 && (
                <div className="mt-3 space-y-2">
                  {mergeUploads.tasks
                    .filter((task) => task.status !== 'succeeded')
                    .map((task) => (
                      <UploadTaskRow
                        key={task.localId}
                        task={task}
                        onCancel={mergeUploads.cancel}
                        onRemove={mergeUploads.remove}
                        onRetry={(failed) => {
                          mergeUploads.remove(failed.localId);
                          mergeUploads.enqueue([failed.file]);
                        }}
                      />
                    ))}
                </div>
              )}
            </div>
          ) : (
            // metadata / protect: whole-document tools with nothing page-level
            // to show, so the main area is a simple document summary instead
            // of the page grid.
            <div className="mx-auto max-w-md p-4 pt-10 sm:p-6 sm:pt-16">
              <div className="rounded-lg border border-line bg-surface p-6 text-center">
                <span
                  aria-hidden="true"
                  className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent"
                >
                  <ShieldCheck className="size-5" />
                </span>
                <p className="mt-3 truncate text-[14.5px] font-semibold text-ink" title={document.filename}>
                  {document.filename}
                </p>
                <p className="mt-1 text-[13px] text-ink-subtle">
                  {formatPageCount(document.pageCount)} · {formatBytes(document.size)}
                </p>
                <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
                  {tool === 'protect'
                    ? 'Set a password on the left, then protect the document. Nobody will be able to open the result without it.'
                    : 'Review this document’s metadata on the left, then remove it to download a cleaned copy.'}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      <ResultDialog
        result={result}
        continuing={continuing}
        onClose={closeResult}
        onContinueEditing={() => void handleContinueEditing()}
        onStartOver={leave}
        allowContinueEditing={resultTool !== 'protect'}
        note={
          resultTool === 'protect' ? (
            <div className="rounded-md border border-warning/25 bg-warning-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-warning">
              This file now needs a password to open. Keep it safe — it can’t be recovered.
            </div>
          ) : undefined
        }
      />

      <Modal
        open={confirmExit}
        onClose={() => setConfirmExit(false)}
        title="Leave without saving?"
        description="Your page changes haven’t been applied yet. Leaving discards them."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmExit(false)}>
              Keep editing
            </Button>
            <Button variant="danger" onClick={leave}>
              Discard and leave
            </Button>
          </>
        }
      />

      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard your changes?"
        description="This restores every page to how the document was uploaded."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDiscard(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                plan.reset(createDrafts(document.pageCount));
                selection.clear();
                setConfirmDiscard(false);
              }}
            >
              Discard changes
            </Button>
          </>
        }
      />
    </div>
  );
}
