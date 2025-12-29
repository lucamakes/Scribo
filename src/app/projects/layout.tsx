'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute';

/**
 * Layout for /projects routes.
 * Wraps all project pages with authentication protection.
 */
export default function ProjectsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <ProtectedRoute>{children}</ProtectedRoute>;
}
