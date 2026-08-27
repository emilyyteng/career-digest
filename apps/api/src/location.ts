import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type LocationVerdict = "us" | "non_us" | "unknown";

const US_STATE_NAMES = new Set(
  [
    "alabama","alaska","arizona","arkansas","california","colorado","connecticut",
    "delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa",
    "kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan",
    "minnesota","mississippi","missouri","montana","nebraska","nevada",
    "new hampshire","new jersey","new mexico","new york","north carolina",
    "north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island",
    "south carolina","south dakota","tennessee","texas","utah","vermont",
    "virginia","washington","west virginia","wisconsin","wyoming",
    "district of columbia",
  ],
);

const US_STATE_ABBR = new Set(
  [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
    "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
    "VA","WA","WV","WI","WY","DC",
  ],
);

const US_COUNTRY = /\b(united states|united states of america|u\.s\.a\.|u\.s\.|usa|us remote|remote us|remote - us)\b/i;

const NON_US_COUNTRIES = [
  "canada","mexico","united kingdom","great britain","england","scotland","wales",
  "northern ireland","ireland","new zealand","australia","germany","france","spain",
  "italy","netherlands","sweden","norway","denmark","finland","switzerland",
  "austria","belgium","portugal","poland","india","japan","china","south korea",
  "korea","singapore","hong kong","brazil","argentina","chile","colombia","peru",
  "israel","uae","united arab emirates","saudi arabia","south africa","nigeria",
  "kenya","egypt","turkey","greece","czech republic","czechia","hungary","romania",
  "ukraine","russia","taiwan","thailand","vietnam","philippines","indonesia",
  "malaysia","pakistan","bangladesh","sri lanka","luxembourg","estonia","latvia",
  "lithuania","iceland","croatia","serbia","slovakia","slovenia","bulgaria",
];

const NON_US_COUNTRY_CODES = new Set(["uk","gb","nz","au","ae"]);

const CANADIAN_PROVINCES = [
  "ontario","quebec","british columbia","alberta","manitoba","saskatchewan",
  "nova scotia","new brunswick","newfoundland","prince edward island","yukon",
  "northwest territories","nunavut",
];
const CANADIAN_ABBR = new Set(["on","qc","bc","ab","mb","sk","ns","nb","nl","pe","yt","nt","nu"]);

const AMBIGUOUS_CITIES = new Set(
  [
    "paris","london","berlin","rome","lima","athens","venice","florence",
    "birmingham","manchester","dublin","cambridge","oxford","plymouth",
    "georgetown","kingston","hamilton","springfield",
  ],
);

const INDIAN_STATES = [
  "haryana","karnataka","maharashtra","tamil nadu","telangana","gujarat",
  "rajasthan","west bengal","kerala","punjab","uttar pradesh","andhra pradesh",
  "madhya pradesh","bihar","odisha","assam","delhi ncr","ncr",
];

const FOREIGN_CITIES = new Set(
  [
    "toronto","auckland","singapore","berlin","madrid","amsterdam","hong kong",
    "gurugram","gurgaon","bengaluru","bangalore","mumbai","hyderabad","pune",
    "sydney","melbourne","vancouver","montreal","ottawa","calgary","waterloo",
    "tokyo","seoul","shanghai","beijing","shenzhen",
    "são paulo","sao paulo","mexico city","tel aviv","zurich","munich","hamburg",
    "barcelona","lisbon","stockholm","oslo","copenhagen","helsinki","warsaw",
    "prague","vienna","brussels","dubai","riyadh","cape town","johannesburg",
    "sparwood",
  ],
);

const US_CITIES = new Set(
  JSON.parse(
    readFileSync(
      path.join(fileURLToPath(new URL(".", import.meta.url)), "data/us-cities.json"),
      "utf8",
    ),
  ) as string[],
);

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/\bon-?site\b|\bhybrid\b|\bin-office\b|\bremote\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitLocations(location: string): string[] {
  return location
    .split(/\s*(?:\||\/|;|•|·|,(?=\s*[A-Z])|\band\b|\bor\b)\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function classifySegment(raw: string): LocationVerdict {
  const text = normalize(raw);
  if (!text) return "unknown";

  if (US_COUNTRY.test(text) || US_COUNTRY.test(raw)) return "us";
  if (US_STATE_NAMES.has(text) || [...US_STATE_NAMES].some((s) => text.endsWith(s))) {
    return "us";
  }
  if (/(?:^|,\s*)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i.test(raw)) {
    return "us";
  }

  for (const country of NON_US_COUNTRIES) {
    if (text === country || text.includes(country)) return "non_us";
  }
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  if (tokens.some((t) => NON_US_COUNTRY_CODES.has(t))) return "non_us";
  if (CANADIAN_PROVINCES.some((p) => text.includes(p))) return "non_us";
  if (INDIAN_STATES.some((p) => text.includes(p))) return "non_us";
  if (tokens.some((t) => CANADIAN_ABBR.has(t))) return "non_us";

  if (FOREIGN_CITIES.has(text) || FOREIGN_CITIES.has(tokens[0] ?? "")) {
    return "non_us";
  }

  if (AMBIGUOUS_CITIES.has(text) || AMBIGUOUS_CITIES.has(tokens[0] ?? "")) {
    return "unknown";
  }

  if (US_CITIES.has(text)) return "us";
  if (tokens.length >= 2 && US_CITIES.has(tokens.slice(0, 2).join(" "))) return "us";
  if (tokens.length === 1 && US_CITIES.has(tokens[0] ?? "")) return "us";

  return "unknown";
}

/**
 * Keep US and unknowns. Drop when there is a non-US signal and no US signal.
 * Mixed US + abroad (New York | London) stays. "Paris, France" drops via country.
 */
export function isAllowedUsLocation(location: string | null | undefined): boolean {
  return classifyLocation(location) !== "non_us";
}

export function classifyLocation(location: string | null | undefined): LocationVerdict {
  if (!location || !location.trim()) return "unknown";

  const raw = location;
  const text = normalize(location);
  const hasUsCountryOrState =
    US_COUNTRY.test(raw) ||
    US_COUNTRY.test(text) ||
    [...US_STATE_NAMES].some((s) => new RegExp(`\\b${s}\\b`).test(text)) ||
    /(?:^|,\s*|\|\s*)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/i.test(
      raw,
    );
  const hasNonUsCountry =
    NON_US_COUNTRIES.some((c) => text.includes(c)) ||
    CANADIAN_PROVINCES.some((p) => text.includes(p)) ||
    INDIAN_STATES.some((p) => text.includes(p)) ||
    /\b(uk|gb|nz)\b/i.test(text);

  if (hasUsCountryOrState) return "us";
  if (hasNonUsCountry) return "non_us";

  const verdicts = splitLocations(location).map(classifySegment);
  if (verdicts.includes("us")) return "us";
  if (verdicts.includes("non_us")) return "non_us";
  return "unknown";
}
