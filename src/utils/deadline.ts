const MONTHS: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11,
};

const MONTH_NAMES =
  'january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec';

/** Prefer API deadline; otherwise scrape common free-text deadline phrases. */
export function extractDeadline(
  description: string,
  apiDeadline?: number | string | null,
): Date | null {
  if (apiDeadline != null && apiDeadline !== '') {
    const seconds = typeof apiDeadline === 'string' ? Number(apiDeadline) : apiDeadline;
    if (Number.isFinite(seconds) && seconds > 0) {
      return new Date(seconds * 1000);
    }
  }

  if (!description) return null;

  const fromHeading = extractDeadlineAfterHeading(description);
  if (fromHeading) return fromHeading;

  const patterns: RegExp[] = [
    // 11:59 PM UTC on August 31st, 2026
    new RegExp(
      `(?:\\d{1,2}:\\d{2}\\s*(?:am|pm)?\\s*(?:utc|est|pst|edt|pdt|cet)?\\s+)?on\\s+(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?`,
      'i',
    ),
    // Deadline: 5 September, 23:59 UTC | Deadline: 20th August, 2026.
    new RegExp(
      `deadline\\s*[:\\-]?\\s*(?:(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)[,\\s]+)?(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})(?:[,\\s]+(\\d{4}))?`,
      'i',
    ),
    // Deadline August 31 | Deadline: August 31, 2026
    new RegExp(
      `deadline\\s*[:\\-]?\\s*(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`,
      'i',
    ),
    // deadline is 14 august.
    new RegExp(
      `deadline\\s+is\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})(?:[,\\s]+(\\d{4}))?`,
      'i',
    ),
    // Submissions close on September 4th, 2026
    new RegExp(
      `(?:submission\\s+)?deadline(?:\\s+to\\s+submit(?:\\s+a\\s+claim)?)?\\s*(?:is|:)?\\s*(?:(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)[,\\s]+)?(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`,
      'i',
    ),
    new RegExp(
      `(?:submissions?\\s+close\\s+on|due\\s+by|ends\\s+on)\\s+(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`,
      'i',
    ),
    // The deadline for entries is Sunday, August 23rd
    new RegExp(
      `deadline[^\\n.]{0,40}?\\bis\\s+(?:(?:sunday|monday|tuesday|wednesday|thursday|friday|saturday)[,\\s]+)?(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:[,\\s]+(\\d{4}))?`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (!match) continue;
    const parsed = parseMatch(match);
    if (parsed) return parsed;
  }

  return null;
}

/** Handles "Deadline\\n11:59 PM UTC on August 31st, 2026" and similar. */
function extractDeadlineAfterHeading(description: string): Date | null {
  const lines = description.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].trim().replace(/^#+\s*/, '').replace(/\*+/g, '');
    if (!/^deadline\s*$/i.test(heading)) continue;

    for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
      const next = lines[j].trim();
      if (!next) continue;
      const parsed = parseDateLine(next);
      if (parsed) return parsed;
      break;
    }
  }
  return null;
}

function parseDateLine(line: string): Date | null {
  const patterns: RegExp[] = [
    // 11:59 PM UTC on August 31st, 2026
    new RegExp(
      `on\\s+(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?`,
      'i',
    ),
    // August 31, 2026 – 10:00 PM EST
    new RegExp(
      `(${MONTH_NAMES})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,\\s*(\\d{4}))?`,
      'i',
    ),
    // 31 August 2026
    new RegExp(
      `(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES})(?:,?\\s*(\\d{4}))?`,
      'i',
    ),
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match) continue;
    const parsed = parseMatch(match);
    if (parsed) return parsed;
  }
  return null;
}

function parseMatch(match: RegExpMatchArray): Date | null {
  const parts = match.slice(1).filter(Boolean);
  if (parts.length < 2) return null;

  let day: number;
  let month: number;
  let year: number | undefined;

  const first = parts[0].toLowerCase();
  if (MONTHS[first] != null) {
    month = MONTHS[first];
    day = Number.parseInt(parts[1], 10);
    year = parts[2] ? Number.parseInt(parts[2], 10) : undefined;
  } else if (MONTHS[parts[1].toLowerCase()] != null) {
    day = Number.parseInt(parts[0], 10);
    month = MONTHS[parts[1].toLowerCase()];
    year = parts[2] ? Number.parseInt(parts[2], 10) : undefined;
  } else {
    return null;
  }

  if (!Number.isFinite(day) || day < 1 || day > 31) return null;

  const now = new Date();
  let resolvedYear = year ?? now.getFullYear();
  let date = new Date(resolvedYear, month, day, 23, 59, 0);

  // If no year and date already passed by > 14 days, assume next year.
  if (year == null) {
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(now.getDate() - 14);
    if (date < twoWeeksAgo) {
      resolvedYear += 1;
      date = new Date(resolvedYear, month, day, 23, 59, 0);
    }
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDeadlineLabel(date: Date): string {
  const day = date.getDate();
  const month = date.toLocaleDateString(undefined, { month: 'short' });
  return `Deadline: ${month} ${day}${ordinal(day)}`;
}

function ordinal(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}
