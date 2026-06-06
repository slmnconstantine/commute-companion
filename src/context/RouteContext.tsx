/**
 * Route Context
 *
 * Manages the user's saved commute routes via AsyncStorage.
 * Provides saved route, recent routes, and route CRUD operations.
 * Consumed by Home, Community, and Set Route screens.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Route } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RouteContextType {
  /** The user's currently active commute route */
  activeRoute: Route | null;
  /** All saved routes for the user */
  recentRoutes: Route[];
  /** Save a new route and set it as active */
  saveRoute: (route: Omit<Route, 'id' | 'user_id' | 'created_at' | 'is_active' | 'route_hash'>) => Promise<void>;
  /** Set an existing route as the active one */
  setActiveRoute: (route: Route) => Promise<void>;
  /** Remove a route from history */
  removeRoute: (id: string) => Promise<void>;
  /** Clear the active route */
  clearActiveRoute: () => Promise<void>;
  /** Whether routes are still loading */
  isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const STORAGE_KEY_ROUTES = '@commute_companion_routes';
const STORAGE_KEY_ACTIVE = '@commute_companion_active_route';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RouteContext = createContext<RouteContextType>({
  activeRoute: null,
  recentRoutes: [],
  saveRoute: async () => {},
  setActiveRoute: async () => {},
  removeRoute: async () => {},
  clearActiveRoute: async () => {},
  isLoading: true,
});

// Simple hash generator for route matching
function generateRouteHash(originLat: number, originLng: number, destLat: number, destLng: number) {
  // A simple geohash-like approximation (rounding to ~1km precision)
  const oLat = originLat.toFixed(2);
  const oLng = originLng.toFixed(2);
  const dLat = destLat.toFixed(2);
  const dLng = destLng.toFixed(2);
  return `${oLat},${oLng}_${dLat},${dLng}`;
}

export function RouteProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [activeRoute, setActiveRouteState] = useState<Route | null>(null);
  const [recentRoutes, setRecentRoutes] = useState<Route[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from Supabase when user session is available
  useEffect(() => {
    if (!profile) {
      setRecentRoutes([]);
      setActiveRouteState(null);
      setIsLoading(false);
      return;
    }

    const fetchRoutes = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('routes')
          .select('*')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          setRecentRoutes(data as Route[]);
          const active = data.find((r: Route) => r.is_active);
          if (active) setActiveRouteState(active);
        }
      } catch (e) {
        console.error('Error loading routes from Supabase:', e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoutes();
  }, [profile]);

  const saveRoute = useCallback(async (routeData: Omit<Route, 'id' | 'user_id' | 'created_at' | 'is_active' | 'route_hash'>) => {
    if (!profile) return;

    // Optional: First, set any currently active route to inactive
    if (activeRoute) {
      await supabase
        .from('routes')
        .update({ is_active: false })
        .eq('id', activeRoute.id);
    }

    const routeHash = generateRouteHash(
      routeData.origin_lat,
      routeData.origin_lng,
      routeData.destination_lat,
      routeData.destination_lng
    );

    const { data, error } = await supabase
      .from('routes')
      .insert({
        ...routeData,
        user_id: profile.id,
        route_hash: routeHash,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save route:', error);
      return;
    }

    if (data) {
      setActiveRouteState(data as Route);
      setRecentRoutes((prev) => {
        const updated = [data as Route, ...prev].filter((r, i, arr) => arr.findIndex(item => item.id === r.id) === i);
        return updated;
      });
    }
  }, [profile, activeRoute]);

  const setActiveRoute = useCallback(async (route: Route) => {
    if (!profile) return;

    // Set all other to false and set this one to true in Supabase
    await supabase.from('routes').update({ is_active: false }).eq('user_id', profile.id);
    
    const { error } = await supabase.from('routes').update({ is_active: true }).eq('id', route.id);
    if (error) {
      console.error('Failed to set active route:', error);
      return;
    }

    setActiveRouteState({ ...route, is_active: true });
    setRecentRoutes((prev) => prev.map((r) => ({
      ...r,
      is_active: r.id === route.id
    })));
  }, [profile]);

  const removeRoute = useCallback(async (id: string) => {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) {
      console.error('Failed to delete route:', error);
      return;
    }

    setRecentRoutes((prev) => prev.filter(r => r.id !== id));
    if (activeRoute?.id === id) {
      setActiveRouteState(null);
    }
  }, [activeRoute]);

  const clearActiveRoute = useCallback(async () => {
    if (activeRoute) {
      await supabase.from('routes').update({ is_active: false }).eq('id', activeRoute.id);
      setActiveRouteState(null);
      setRecentRoutes((prev) => prev.map(r => ({ ...r, is_active: false })));
    }
  }, [activeRoute]);

  return (
    <RouteContext.Provider value={{
      activeRoute,
      recentRoutes,
      saveRoute,
      setActiveRoute,
      removeRoute,
      clearActiveRoute,
      isLoading
    }}>
      {children}
    </RouteContext.Provider>
  );
}

export const useRoute = () => useContext(RouteContext);
