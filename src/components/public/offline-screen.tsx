'use client';
import { useSyncExternalStore } from 'react';
import { HomeScreen, DirectoryScreen, GuidanceScreen, MapScreen, AboutScreen } from './screens';
const subscribe = () => () => {};
export function OfflineScreen() {
  const path = useSyncExternalStore(
    subscribe,
    () => window.location.pathname,
    () => '/',
  );
  if (path === '/directory') return <DirectoryScreen initialSearch="" />;
  if (path === '/guidance') return <GuidanceScreen />;
  if (path === '/campus-map') return <MapScreen />;
  if (path === '/about') return <AboutScreen />;
  return <HomeScreen />;
}
