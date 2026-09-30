export const pakistanCities = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Peshawar",
  "Quetta",
  "Multan",
  "Hyderabad",
  "Gujranwala",
  "Sialkot",
  "Bahawalpur",
  "Sargodha",
  "Abbottabad",
] as const;

const personNamePattern = /^\p{L}+(?:\s+\p{L}+)*$/u;
const pakistanMobilePattern = /^(?:(?:\+|00)?92|0)?3\d{9}$/;

export function sanitizePersonName(value: string) {
  return value.replace(/[^\p{L}\s]/gu, "").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function isValidPersonName(value: string) {
  return personNamePattern.test(value.trim());
}

export function sanitizePakistanPhone(value: string) {
  return value.replace(/[^\d+()\s-]/g, "").slice(0, 24);
}

export function normalizePakistanPhone(value: string) {
  return value.replace(/[\s()-]/g, "");
}

export function isValidPakistanMobile(value: string) {
  return pakistanMobilePattern.test(normalizePakistanPhone(value));
}

export function isAllowedPakistanCity(value: string) {
  return pakistanCities.some((city) => city.toLowerCase() === value.trim().toLowerCase());
}