/**
 * The only part of the app that runs while you are not looking at it.
 *
 * One GPS fix every 30 seconds, written straight to SQLite. No decisions are
 * made here — the collector reads the trail later. Keeping this dumb is what
 * makes the game rules testable under Node.
 *
 * Android will not let a foreground service hide, so the notification below is
 * permanent and is part of the design rather than a wart to fix.
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { GPS_INTERVAL_SECONDS } from '../prototype/src/dwell.js';
import { recordFix } from './db.js';

export const TASK = 'haunts-location';

TaskManager.defineTask(TASK, async ({ data, error }) => {
  if (error || !data?.locations) return;
  for (const loc of data.locations) {
    await recordFix({
      t: Math.floor(loc.timestamp / 1000),
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
    });
  }
});

/**
 * Ask for foreground then background permission — Android requires that order,
 * and the background dialog only appears once foreground is granted.
 *
 * @returns {Promise<{ok: boolean, reason?: string}>}
 */
export async function requestPermissions() {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { ok: false, reason: 'foreground denied' };
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return { ok: false, reason: 'background denied' };
  return { ok: true };
}

export async function isTracking() {
  return Location.hasStartedLocationUpdatesAsync(TASK);
}

export async function startTracking() {
  if (await isTracking()) return { ok: true };
  const perm = await requestPermissions();
  if (!perm.ok) return perm;

  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: GPS_INTERVAL_SECONDS * 1000,
    distanceInterval: 0,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: 'Haunts',
      notificationBody: 'Listening for spirits of place.',
      notificationColor: '#7C5CFF',
    },
  });
  return { ok: true };
}

export async function stopTracking() {
  if (await isTracking()) await Location.stopLocationUpdatesAsync(TASK);
}
