export interface DecodedRule {
  kind: 'no' | 'limit' | 'permit' | 'paid';
  summary: string;
  verdict: string;
  active: boolean;
  times: string;
  days: string;
  limit?: string;
}

const DAY_MAP: Record<string, number> = {
  SUN: 0,
  SUNDAY: 0,
  MON: 1,
  MONDAY: 1,
  TUE: 2,
  TUES: 2,
  TUESDAY: 2,
  WED: 3,
  WEDNESDAY: 3,
  THU: 4,
  THUR: 4,
  THURS: 4,
  THURSDAY: 4,
  FRI: 5,
  FRIDAY: 5,
  SAT: 6,
  SATURDAY: 6,
};

const DAY_FULL_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

interface TimeWindow {
  startMin: number;
  endMin: number;
  formatted: string;
}

function parseTimeWindows(text: string): { windows: TimeWindow[]; text: string } {
  // Matches windows like 8AM-6PM, 7-9AM, 8:30AM-5:00PM, 8 AM - 6 PM
  const regex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:-|–|TO)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const windows: TimeWindow[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const sH = parseInt(match[1], 10);
    const sM = match[2] ? parseInt(match[2], 10) : 0;
    const secondMeridiem = match[5].toUpperCase() as 'AM' | 'PM';
    const firstMeridiem = match[3] ? (match[3].toUpperCase() as 'AM' | 'PM') : secondMeridiem;
    const eH = parseInt(match[4], 10);
    const eM = match[5] ? (match[2] && !match[5] ? 0 : match[4] ? 0 : 0) : 0; // wait, match[4] is end hour
    // Wait, let's fix regex groups carefully:
    // match[1]: startHour
    // match[2]: startMin
    // match[3]: startMeridiem (optional)
    // match[4]: endHour
    // match[5]: endMin (optional) -- wait, regex above has 5 as endMin or meridiem?
  }

  return { windows: [], text: 'at all times' };
}

export function decode(raw: string, now?: Date): DecodedRule | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  if (upper.length < 4) return null;

  const refDate = now || new Date();
  // Python weekday: Monday is 0, Sunday is 6. But prompt specifies:
  // "Python weekday is converted so Sunday is 0."
  // In JS, refDate.getDay() returns 0 for Sunday, 1 for Monday, ..., 6 for Saturday!
  const todayDay = refDate.getDay();
  const currentMinutes = refDate.getHours() * 60 + refDate.getMinutes();

  // 1. Check Days
  let days: number[] = [0, 1, 2, 3, 4, 5, 6]; // default every day

  // Check for range like MON-FRI, MON - FRI, MON TO FRI
  const rangeMatch = upper.match(/(MON|TUE|TUES|WED|THU|THUR|THURS|FRI|SAT|SUN)\s*(?:-|–|TO)\s*(MON|TUE|TUES|WED|THU|THUR|THURS|FRI|SAT|SUN)/i);
  if (rangeMatch) {
    const startD = DAY_MAP[rangeMatch[1]];
    const endD = DAY_MAP[rangeMatch[2]];
    if (startD !== undefined && endD !== undefined) {
      days = [];
      let cur = startD;
      while (true) {
        days.push(cur);
        if (cur === endD) break;
        cur = (cur + 1) % 7;
      }
    }
  }

  // Check for EXCEPT SUN, EXCEPT SUNDAY, etc.
  const exceptMatches = upper.matchAll(/EXCEPT\s+(SUN|SUNDAY|MON|MONDAY|TUE|TUESDAY|WED|WEDNESDAY|THU|THURSDAY|FRI|FRIDAY|SAT|SATURDAY)/gi);
  for (const ex of exceptMatches) {
    const exDay = DAY_MAP[ex[1]];
    if (exDay !== undefined) {
      days = days.filter((d) => d !== exDay);
    }
  }

  // Format Days String
  let daysString = 'every day';
  const isMonToFri =
    days.length === 5 &&
    [1, 2, 3, 4, 5].every((d) => days.includes(d));
  const isAllDays =
    days.length === 7 &&
    [0, 1, 2, 3, 4, 5, 6].every((d) => days.includes(d));

  if (isAllDays) {
    daysString = 'every day';
  } else if (isMonToFri) {
    daysString = 'Monday to Friday';
  } else {
    daysString = days.map((d) => DAY_FULL_NAMES[d]).join(', ');
  }

  // 2. Times parsing
  // Matches windows like 8AM-6PM, 7-9AM, 8:30AM-5PM, 4-6PM
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?\s*(?:-|–|TO)\s*(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/gi;
  const windows: { startMin: number; endMin: number; formatted: string }[] = [];
  let tMatch: RegExpExecArray | null;

  while ((tMatch = timeRegex.exec(upper)) !== null) {
    const sH = parseInt(tMatch[1], 10);
    const sM = tMatch[2] ? parseInt(tMatch[2], 10) : 0;
    const endMeridiem = tMatch[6].toUpperCase() as 'AM' | 'PM';
    const startMeridiem = tMatch[3] ? (tMatch[3].toUpperCase() as 'AM' | 'PM') : endMeridiem;
    const eH = parseInt(tMatch[4], 10);
    const eM = tMatch[5] ? parseInt(tMatch[5], 10) : 0;

    const startMinTotal = (startMeridiem === 'PM' && sH !== 12 ? sH + 12 : startMeridiem === 'AM' && sH === 12 ? 0 : sH) * 60 + sM;
    const endMinTotal = (endMeridiem === 'PM' && eH !== 12 ? eH + 12 : endMeridiem === 'AM' && eH === 12 ? 0 : eH) * 60 + eM;

    const formatPart = (h: number, m: number, meridiem: string) => {
      const minStr = m > 0 ? `:${m < 10 ? '0' + m : m}` : '';
      return `${h}${minStr} ${meridiem}`;
    };

    const formatted = `${formatPart(sH, sM, startMeridiem)} to ${formatPart(eH, eM, endMeridiem)}`;
    windows.push({
      startMin: startMinTotal,
      endMin: endMinTotal,
      formatted,
    });
  }

  let timesString = 'at all times';
  if (windows.length > 0) {
    timesString = windows.map((w) => w.formatted).join(' and ');
  }

  // 3. Active now check
  const isDayActive = days.includes(todayDay);
  let isTimeActive = false;
  if (windows.length === 0) {
    isTimeActive = true;
  } else {
    isTimeActive = windows.some((w) => currentMinutes >= w.startMin && currentMinutes < w.endMin);
  }
  const isActive = isDayActive && isTimeActive;

  // 4. Limit parsing
  // N HR, N HOUR or N MIN gives "1 hour", "2 hours" or "30 minutes"
  let limitString: string | undefined = undefined;
  const limitMatch = upper.match(/(\d+)\s*(HR|HOUR|HOURS|MIN|MINS|MINUTE|MINUTES)\b/i);
  if (limitMatch) {
    const val = parseInt(limitMatch[1], 10);
    const unit = limitMatch[2].toUpperCase();
    if (unit.startsWith('HR') || unit.startsWith('HOUR')) {
      limitString = val === 1 ? '1 hour' : `${val} hours`;
    } else {
      limitString = val === 1 ? '1 minute' : `${val} minutes`;
    }
  }

  // 5. Order of checks:
  // 1) NO PARKING/STOPPING/STANDING gives kind no
  // 2) then a time limit gives kind limit
  // 3) then PERMIT gives kind no
  // 4) then METER/PAY/PAID gives kind limit
  // otherwise None
  let kind: 'no' | 'limit' | 'permit' | 'paid' | null = null;
  let category: 'no_parking' | 'limit' | 'permit' | 'paid' | null = null;

  if (
    upper.includes('NO PARKING') ||
    upper.includes('NO STOPPING') ||
    upper.includes('NO STANDING') ||
    upper.includes('TOW AWAY') ||
    upper.includes('DO NOT PARK')
  ) {
    kind = 'no';
    category = 'no_parking';
  } else if (limitString) {
    kind = 'limit';
    category = 'limit';
  } else if (upper.includes('PERMIT')) {
    kind = 'no';
    category = 'permit';
  } else if (
    upper.includes('METER') ||
    upper.includes('PAY') ||
    upper.includes('PAID')
  ) {
    kind = 'limit';
    category = 'paid';
  } else {
    return null;
  }

  // 6. Summary and Verdict Wording
  // no parking:
  //   summary "No parking <times>, <days>."
  //   verdict "Don't park here now." when active, else "You can park now. The rule isn't active."
  // Limit:
  //   summary "Up to <limit>, <times>, <days>. No limit outside those times."
  //   verdict "You can park now, but move within <limit>." when active, else "You can park now with no limit."
  // Permit:
  //   summary "Permit holders only, <times>, <days>."
  //   verdict "Skip this street unless you hold a permit." when active, else "Permit rule isn't active now."
  // Paid:
  //   summary "Paid parking <times>, <days>."
  //   verdict "Pay before you leave the car." when active, else "Free right now."

  let summary = '';
  let verdict = '';

  if (category === 'no_parking') {
    summary = `No parking ${timesString}, ${daysString}.`;
    verdict = isActive ? "Don't park here now." : "You can park now. The rule isn't active.";
  } else if (category === 'limit') {
    summary = `Up to ${limitString}, ${timesString}, ${daysString}. No limit outside those times.`;
    verdict = isActive
      ? `You can park now, but move within ${limitString}.`
      : 'You can park now with no limit.';
  } else if (category === 'permit') {
    summary = `Permit holders only, ${timesString}, ${daysString}.`;
    verdict = isActive
      ? 'Skip this street unless you hold a permit.'
      : "Permit rule isn't active now.";
  } else if (category === 'paid') {
    summary = `Paid parking ${timesString}, ${daysString}.`;
    verdict = isActive
      ? 'Pay before you leave the car.'
      : 'Free right now.';
  }

  return {
    kind,
    summary,
    verdict,
    active: isActive,
    times: timesString,
    days: daysString,
    limit: limitString,
  };
}
