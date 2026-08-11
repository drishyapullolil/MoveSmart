// MoveSmart Offset Timing Utility Functions

/**
 * Parses time string (e.g., "08:00 AM", "14:30", "8:15") into total minutes from midnight (0..1439).
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 480; // Default 08:00 AM (480 mins)
  
  const cleanStr = timeStr.trim().toUpperCase();
  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");
  
  const match = cleanStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 480;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return (hours * 60 + minutes) % 1440;
}

/**
 * Adds minutes (and optional delay buffer) to a time string and returns formatted 12-hour time string.
 * @param {string} timeStr - Base start time (e.g. "08:00 AM" or "08:00")
 * @param {number} minutesToAdd - Offset minutes from source
 * @param {number} [bufferMinutes=0] - Additional traffic buffer minutes
 * @returns {string} Formatted arrival time (e.g., "08:45 AM", "10:00 AM")
 */
export function addMinutesToTime(timeStr, minutesToAdd = 0, bufferMinutes = 0) {
  const baseMins = parseTimeToMinutes(timeStr);
  const totalMins = (baseMins + Number(minutesToAdd) + Number(bufferMinutes)) % 1440;

  const hours24 = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  const formattedHours = hours12.toString().padStart(2, "0");
  const formattedMins = mins.toString().padStart(2, "0");

  return `${formattedHours}:${formattedMins} ${period}`;
}

/**
 * Formats total duration in minutes to human-readable string (e.g. 135 -> "2h 15m", 45 -> "45m").
 */
export function formatMinutesToDuration(totalMinutes) {
  const mins = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours === 0) return `${remainingMins}m`;
  if (remainingMins === 0) return `${hours}h`;
  return `${hours}h ${remainingMins}m`;
}

/**
 * Recalculates cumulative offset_minutes and total duration for an array of stops.
 * @param {Array<{ name: string, travel_time_from_prev: number }>} stopsArray
 */
export function calculateCumulativeOffsets(stopsArray) {
  if (!Array.isArray(stopsArray)) return { stops: [], totalDurationMinutes: 0, durationStr: "0m" };

  let currentCumulative = 0;
  const updatedStops = stopsArray.map((stop, idx) => {
    const travelTime = idx === 0 ? 0 : Math.max(0, Number(stop.travel_time_from_prev) || 0);
    currentCumulative += travelTime;
    return {
      ...stop,
      order: idx + 1,
      travel_time_from_prev: travelTime,
      offset_minutes: currentCumulative,
    };
  });

  return {
    stops: updatedStops,
    totalDurationMinutes: currentCumulative,
    durationStr: formatMinutesToDuration(currentCumulative),
  };
}
