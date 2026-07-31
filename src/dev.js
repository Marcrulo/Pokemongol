/**
 * Development shortcuts. Never active in a release build.
 *
 * The real rules make testing painful on purpose: five minutes standing still
 * per attempt, and one haunt per place per day means the second attempt at
 * your desk yields nothing at all. Both are correct for playing and useless
 * for building.
 *
 * Everything here is gated on `__DEV__`, which React Native sets false in any
 * production bundle. A shipped app therefore cannot take these paths even if
 * the flags below are left switched on.
 */

import { MIN_DWELL_SECONDS } from '../prototype/src/dwell.js';

/** True only when running from Metro. */
export const IS_DEV = typeof __DEV__ !== 'undefined' && __DEV__;

/** Long enough to be a deliberate pause, short enough to iterate on. */
export const DEV_DWELL_SECONDS = 60;

/**
 * Mutable so the in-app controls can flip it without a reload. Defaults to on
 * in development, because that is the point.
 */
const state = {
  shortDwell: IS_DEV,
  repeatPlaces: IS_DEV,
};

/** @returns {{shortDwell: boolean, repeatPlaces: boolean}} */
export const devFlags = () => ({ ...state });

export function setDevFlag(name, value) {
  if (!IS_DEV) return;
  if (name in state) state[name] = Boolean(value);
}

/** Seconds a stay must last to count. The real rule unless shortened here. */
export function dwellThreshold() {
  return IS_DEV && state.shortDwell ? DEV_DWELL_SECONDS : MIN_DWELL_SECONDS;
}

/**
 * Whether a place may yield more than one haunt in a day.
 *
 * Off in production: the one-per-place rule exists because GPS drift split a
 * single long visit into two qualifying stays on 26% of days.
 */
export function allowRepeatPlaces() {
  return IS_DEV && state.repeatPlaces;
}
