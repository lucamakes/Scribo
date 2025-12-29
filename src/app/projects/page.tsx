'use client';

import { useRouter } from 'next/navigation';
import { ProjectList } from '@/components/ProjectList/ProjectList';
import { useCallback } from 'react';

/**
 * Projects overview page showing all user projects.
 */
export default function ProjectsPage() {
    const router = useRouter();

    const handleSelectProject = useCallback((project: { id: string }) => {
        router.push(`/projects/${project.id}`);
    }, [router]);

    return <ProjectList onSelectProject={handleSelectProject} />;
}
