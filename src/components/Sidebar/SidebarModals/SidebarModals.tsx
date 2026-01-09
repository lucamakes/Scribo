'use client';

import { useSidebar } from '../SidebarContext';
import { TrashPanel } from '@/components/TrashPanel/TrashPanel';
import { ExportModal } from '@/components/ExportModal/ExportModal';

export function SidebarModals() {
  const { project, showTrash, setShowTrash, showExport, setShowExport, reloadItems } = useSidebar();

  return (
    <>
      <TrashPanel
        projectId={project.id}
        isOpen={showTrash}
        onClose={() => setShowTrash(false)}
        onItemRestored={reloadItems}
      />

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        projectName={project.name}
        projectId={project.id}
      />
    </>
  );
}
