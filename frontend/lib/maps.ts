export function buildMapsQuery(name?: string | null, address?: string | null) {
  const parts = [name, address, "Huntsville AL"].filter(Boolean);
  return encodeURIComponent(parts.join(" "));
}

export function getAppleMapsLink(query: string) {
  return `https://maps.apple.com/?q=${query}`;
}

export function getGoogleMapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function getPreferredMapsLink(query: string) {
  return isIOS() ? getAppleMapsLink(query) : getGoogleMapsLink(query);
}
