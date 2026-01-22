'use client';

import { type ReactNode } from 'react';
import { GoalServiceContext, type GoalService, supabaseGoalService } from '@/lib/services/goalService';
import { demoGoalService } from '@/lib/services/demoGoalService';

interface GoalServiceProviderProps {
  children: ReactNode;
  service: GoalService;
}

export function GoalServiceProvider({ children, service }: GoalServiceProviderProps) {
  return (
    <GoalServiceContext.Provider value={service}>
      {children}
    </GoalServiceContext.Provider>
  );
}

export function SupabaseGoalProvider({ children }: { children: ReactNode }) {
  return (
    <GoalServiceProvider service={supabaseGoalService}>
      {children}
    </GoalServiceProvider>
  );
}

export function DemoGoalProvider({ children }: { children: ReactNode }) {
  return (
    <GoalServiceProvider service={demoGoalService}>
      {children}
    </GoalServiceProvider>
  );
}
