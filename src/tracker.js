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
  if (error) {
    console.log('[haunts] task error', error);
    return;
  }
  if (!data?.locations) {
    console.log('[haunts] task fired with no locations');
    return;
  }
  for (const loc of data.locations) {
    const written = await recordFix({
      t: Math.floor(loc.timestamp / 1000),
      lat: loc.coords.latitude,
      lon: loc.coords.longitude,
      accuracy: loc.coords.accuracy ?? null,
    });

    // Only report what actually reached the trail. Android delivers several
    // times faster than we sample, so logging every delivery buries the
    // signal — and the discarded ones are not evidence of anything.
    if (written) {
      const age = Math.round((Date.now() - loc.timestamp) / 1000);
      console.log(
        `[haunts] fix age=${age}s acc=${loc.coords.accuracy?.toFixed(0)}m ` +
          `${loc.coords.latitude.toFixed(6)},${loc.coords.longitude.toFixed(6)}`,
      );
    }
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

/**
 * What Android will actually let us do right now.
 *
 * `foreground-only` is the dangerous one and the reason this exists: the task
 * registers, the service runs, the button says "Listening", and nothing is
 * ever recorded — because the app is only permitted to see location while it
 * is open, which is the one time it isn't needed. It is not a first-run
 * problem either. Android revokes background location from apps it decides
 * are unused, so a working install becomes a silent one months later.
 *
 * @returns {Promise<'ready'|'foreground-only'|'off'>}
 */
export async function permissionState() {
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== 'granted') return 'off';
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === 'granted' ? 'ready' : 'foreground-only';
}

export async function startTracking() {
  // Checked even when already started: permission can be withdrawn under a
  // running task, and the old early return meant we never noticed.
  const state = await permissionState();
  if (state !== 'ready') {
    const perm = await requestPermissions();
    if (!perm.ok) return perm;
  }
  if (await isTracking()) return { ok: true };

  await Location.startLocationUpdatesAsync(TASK, {
    // Balanced targets ~100 m, which Android satisfies from Wi-Fi and cell
    // towers without waking the GPS chip. The dwell detector clusters at 50 m,
    // so 100 m cannot resolve the thing the game is built on.
    accuracy: Location.Accuracy.High,
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
