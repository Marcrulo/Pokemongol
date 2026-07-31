/**
 * Where the sun is, from a place and a moment.
 *
 * This is the one weather measurement that needs no network: it is
 * deterministic astronomy, so it works offline, in the terminal simulation,
 * and on a phone in a tunnel. Only cloud, temperature and rain have to be
 * fetched.
 *
 * Altitude is the angle of the sun above the horizon in degrees. Negative
 * means below it, and how negative distinguishes dusk from the dead of night:
 *
 *     > 0    daylight
 *    -6..0   civil twilight — you can still read outside
 *   -18..-6  deeper twilight
 *    < -18   astronomical night
 *
 * The algorithm is the standard low-precision solar position calculation
 * (NOAA / Astronomical Almanac). Accurate to roughly a hundredth of a degree,
 * which is far beyond what a game needs.
 *
 * No platform imports — this file runs under Node and inside React Native.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/** Days from the J2000.0 epoch (2000-01-01 12:00 UTC) to a given instant. */
function daysSinceJ2000(date) {
  return date.getTime() / 86_400_000 - 10_957.5;
}

/**
 * Sun altitude in degrees above the horizon.
 *
 * @param {number} lat   latitude, degrees north
 * @param {number} lon   longitude, degrees east
 * @param {Date}   date  the moment, in real (UTC-aware) time
 * @returns {number} degrees; negative below the horizon
 */
export function sunAltitude(lat, lon, date) {
  const n = daysSinceJ2000(date);

  // Position of the sun along the ecliptic.
  const meanLongitude = (280.46 + 0.985_647_4 * n) * RAD;
  const meanAnomaly = (357.528 + 0.985_600_3 * n) * RAD;
  const eclipticLongitude =
    meanLongitude +
    (1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD;

  // Convert to equatorial coordinates.
  const obliquity = (23.439 - 0.000_000_4 * n) * RAD;
  const declination = Math.asin(
    Math.sin(obliquity) * Math.sin(eclipticLongitude),
  );
  const rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  );

  // Greenwich then local sidereal time, giving the hour angle.
  const gmstHours = 18.697_374_558 + 24.065_709_824_419_08 * n;
  const lstDegrees = (gmstHours * 15 + lon) % 360;
  const hourAngle = lstDegrees * RAD - rightAscension;

  const phi = lat * RAD;
  const sinAltitude =
    Math.sin(phi) * Math.sin(declination) +
    Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle);

  return Math.asin(Math.max(-1, Math.min(1, sinAltitude))) * DEG;
}

/**
 * A word for an altitude, for anything that has to read it aloud.
 * @param {number} altitude degrees
 */
export function daylightBand(altitude) {
  if (altitude > 0) return 'daylight';
  if (altitude > -6) return 'twilight';
  if (altitude > -18) return 'dusk';
  return 'night';
}
