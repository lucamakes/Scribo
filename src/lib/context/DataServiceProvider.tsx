'use client';

import { type ReactNode } from 'react';
import { DataServiceContext, type DataService } from '@/lib/services/dataService';
import { supabaseDataService } from '@/lib/services/supabaseDataService';
import { demoDataService } from '@/lib/services/demoDataService';

interface DataServiceProviderProps {
  children: ReactNode;
  service: DataService;
}

/**
 * Provider that injects a DataService implementation.
 * Use SupabaseDataProvider or DemoDataProvider for convenience.
 */
export function DataServiceProvider({ children, service }: DataServiceProviderProps) {
  return (
    <DataServiceContext.Provider value={service}>
      {children}
    </DataServiceContext.Provider>
  );
}

/**
 * Provider for production mode using Supabase.
 */
export function SupabaseDataProvider({ children }: { children: ReactNode }) {
  return (
    <DataServiceProvider service={supabaseDataService}>
      {children}
    </DataServiceProvider>
  );
}

/**
 * Provider for demo mode using localStorage.
 */
export function DemoDataProvider({ children }: { children: ReactNode }) {
  return (
    <DataServiceProvider service={demoDataService}>
      {children}
    </DataServiceProvider>
  );
}
