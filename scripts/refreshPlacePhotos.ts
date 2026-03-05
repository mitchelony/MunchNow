/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import https from "https";
import { URL } from "url";

type PlaceRow = {
  id: number;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  google_place_id?: string | null;
  photo_url?: string | null;
  image_url?: string | null;
};

type CandidatePlace = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
};

type PhotoMeta = {
  name: string;
  widthPx?: number;
  heightPx?: number;
};

type PlaceDetails = {
  id: string;
  photos?: PhotoMeta[];
  displayName?: { text?: string };
  formattedAddress?: string;
};

type ReportRow = {
  place_id: number;
  place_name: string;
  old_photo_url: string;
  new_photo_url: string;
  status: string;
  notes: string;
};

type Config = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  googleMapsApiKey: string;
  bucket: string;
  limit?: number;
  placeIds?: number[];
  dryRun: boolean;
  delayMs: number;
};

type HttpResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
};

const REPORT_PATH = path.resolve(process.cwd(), "scripts/refreshPlacePhotos_report.csv");

function parseArgs(argv: string[]) {
  let limit: number | undefined;
  let placeIds: number[] | undefined;
  let dryRun = false;
  let delayMs = 250;
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      limit = Number(arg.split("=")[1]);
    } else if (arg.startsWith("--place-ids=")) {
      const raw = arg.split("=")[1] ?? "";
      const parsed = raw
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0);
      placeIds = Array.from(new Set(parsed));
    } else if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg.startsWith("--delay-ms=")) {
      delayMs = Number(arg.split("=")[1]);
    }
  }
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive number");
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error("--delay-ms must be a non-negative number");
  }
  if (placeIds && !placeIds.length) {
    throw new Error("--place-ids must contain at least one positive numeric id");
  }
  return { limit, placeIds, dryRun, delayMs };
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function loadEnv() {
  loadEnvFile(path.resolve(process.cwd(), "backend/.env"));
  loadEnvFile(path.resolve(process.cwd(), "backend/.env.local"));
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toRecordHeaders(headers: Record<string, string>): Record<string, string> {
  return headers;
}

function httpRequest(
  method: "GET" | "POST" | "PATCH",
  url: string,
  headers: Record<string, string> = {},
  body?: Buffer | string,
  redirects = 4
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: toRecordHeaders(headers),
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", async () => {
          const status = res.statusCode ?? 0;
          const response: HttpResponse = {
            status,
            headers: res.headers as Record<string, string | string[] | undefined>,
            body: Buffer.concat(chunks),
          };
          if (
            redirects > 0 &&
            [301, 302, 303, 307, 308].includes(status) &&
            response.headers.location
          ) {
            const nextUrl = new URL(String(response.headers.location), url).toString();
            try {
              const redirected = await httpRequest("GET", nextUrl, {}, undefined, redirects - 1);
              resolve(redirected);
              return;
            } catch (err) {
              reject(err);
              return;
            }
          }
          resolve(response);
        });
      }
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function jsonOrThrow<T>(resp: HttpResponse, context: string): T {
  const txt = resp.body.toString("utf8");
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`${context} failed (${resp.status}): ${txt}`);
  }
  return JSON.parse(txt) as T;
}

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const sa = new Set(a.split(" "));
  const sb = new Set(b.split(" "));
  if (!sa.size || !sb.size) return 0;
  let intersection = 0;
  for (const token of sa) if (sb.has(token)) intersection += 1;
  return intersection / Math.max(sa.size, sb.size);
}

function scoreCandidate(place: PlaceRow, candidate: CandidatePlace): number {
  const targetName = normalize(place.name);
  const targetAddr = normalize(
    [place.address, place.city, place.state].filter(Boolean).join(" ")
  );
  const candName = normalize(candidate.displayName?.text);
  const candAddr = normalize(candidate.formattedAddress);

  let score = 0;
  if (targetName && candName) {
    if (targetName === candName) score += 4;
    else if (candName.includes(targetName) || targetName.includes(candName)) score += 2;
    score += tokenOverlapScore(targetName, candName) * 3;
  }
  if (targetAddr && candAddr) {
    if (candAddr.includes(targetAddr) || targetAddr.includes(candAddr)) score += 2;
    score += tokenOverlapScore(targetAddr, candAddr) * 2;
  }
  return score;
}

async function fetchPlaces(config: Config): Promise<{ rows: PlaceRow[]; photoCol: "photo_url" | "image_url" }> {
  const base = config.supabaseUrl.replace(/\/$/, "");
  const headers = {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    Accept: "application/json",
  };
  const limitPart = config.limit ? `&limit=${config.limit}` : "";
  const idFilterPart =
    config.placeIds && config.placeIds.length
      ? `&id=in.(${config.placeIds.join(",")})`
      : "";
  const selectAttempts = [
    "id,name,address,city,state,photo_url,google_place_id",
    "id,name,address,city,state,image_url,google_place_id",
    "id,name,address,city,image_url,google_place_id",
  ];
  for (const select of selectAttempts) {
    const url = `${base}/rest/v1/places?select=${encodeURIComponent(select)}&order=id.asc${idFilterPart}${limitPart}`;
    const resp = await httpRequest("GET", url, headers);
    if (resp.status >= 200 && resp.status < 300) {
      const rows = JSON.parse(resp.body.toString("utf8")) as PlaceRow[];
      const photoCol: "photo_url" | "image_url" = select.includes("photo_url") ? "photo_url" : "image_url";
      return { rows, photoCol };
    }
  }
  throw new Error("Unable to select places with expected columns (photo_url/image_url)");
}

async function searchGoogleCandidates(apiKey: string, place: PlaceRow): Promise<CandidatePlace[]> {
  const input = [place.name, place.address, place.city, place.state].filter(Boolean).join(" ");
  const body = JSON.stringify({
    textQuery: input,
    languageCode: "en",
    maxResultCount: 5,
  });
  const resp = await httpRequest(
    "POST",
    "https://places.googleapis.com/v1/places:searchText",
    {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
    },
    body
  );
  const data = jsonOrThrow<{ places?: CandidatePlace[] }>(resp, "Google text search");
  const candidates = data.places ?? [];
  return candidates.sort((a, b) => scoreCandidate(place, b) - scoreCandidate(place, a));
}

async function findPlaceIdOwner(config: Config, googlePlaceId: string): Promise<number | null> {
  const base = config.supabaseUrl.replace(/\/$/, "");
  const url = `${base}/rest/v1/places?select=id&google_place_id=eq.${encodeURIComponent(
    googlePlaceId
  )}&limit=1`;
  const resp = await httpRequest("GET", url, {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    Accept: "application/json",
  });
  const rows = jsonOrThrow<Array<{ id: number }>>(resp, "Lookup google_place_id owner");
  return rows.length ? rows[0].id : null;
}

async function getPlaceDetails(apiKey: string, placeId: string): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(
    placeId
  )}?fields=id,displayName,formattedAddress,photos`;
  const resp = await httpRequest("GET", url, {
    "X-Goog-Api-Key": apiKey,
  });
  return jsonOrThrow<PlaceDetails>(resp, "Google place details");
}

function pickCoverPhoto(details: PlaceDetails): PhotoMeta | null {
  const photos = details.photos ?? [];
  const minSize = 480;
  const largeEnough = photos.filter(
    (p) =>
      typeof p.widthPx === "number" &&
      typeof p.heightPx === "number" &&
      p.widthPx >= minSize &&
      p.heightPx >= minSize
  );
  const source = largeEnough.length ? largeEnough : photos;
  if (!source.length) return null;
  source.sort((a, b) => (b.widthPx ?? 0) * (b.heightPx ?? 0) - (a.widthPx ?? 0) * (a.heightPx ?? 0));
  return source[0] ?? null;
}

async function downloadGooglePhoto(apiKey: string, photo: PhotoMeta): Promise<Buffer> {
  const mediaPath = photo.name.startsWith("photos/")
    ? `places/${photo.name}`
    : photo.name;
  const url = `https://places.googleapis.com/v1/${mediaPath}/media?maxWidthPx=1600&key=${encodeURIComponent(
    apiKey
  )}`;
  const resp = await httpRequest("GET", url);
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`Google photo download failed (${resp.status})`);
  }
  if (!resp.body.length) throw new Error("Google photo download returned empty body");
  return resp.body;
}

function buildStoragePath(placeId: number): string {
  return `places/${placeId}/cover.jpg`;
}

function buildPublicUrl(supabaseUrl: string, bucket: string, objectPath: string): string {
  const cleanedBase = supabaseUrl.replace(/\/$/, "");
  return `${cleanedBase}/storage/v1/object/public/${bucket}/${objectPath}`;
}

async function uploadToSupabaseStorage(
  config: Config,
  objectPath: string,
  bytes: Buffer
): Promise<void> {
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${config.bucket}/${objectPath}`;
  const resp = await httpRequest(
    "POST",
    url,
    {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "Content-Type": "image/jpeg",
      "x-upsert": "true",
    },
    bytes
  );
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`Upload failed (${resp.status}): ${resp.body.toString("utf8")}`);
  }
}

async function updatePlaceRow(
  config: Config,
  placeId: number,
  photoColumn: "photo_url" | "image_url",
  publicUrl: string,
  googlePlaceId: string
): Promise<void> {
  const url = `${config.supabaseUrl.replace(/\/$/, "")}/rest/v1/places?id=eq.${placeId}`;
  const patch: Record<string, unknown> = {
    photo_source: "google",
    photo_updated_at: new Date().toISOString(),
    google_place_id: googlePlaceId,
    [photoColumn]: publicUrl,
  };
  const resp = await httpRequest(
    "PATCH",
    url,
    {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    JSON.stringify(patch)
  );
  if (resp.status < 200 || resp.status >= 300) {
    throw new Error(`DB update failed (${resp.status}): ${resp.body.toString("utf8")}`);
  }
}

function isDuplicateGooglePlaceIdError(message: string): boolean {
  return message.includes("23505") && message.includes("google_place_id");
}

function csvEscape(v: string): string {
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function writeReport(rows: ReportRow[]) {
  const headers = [
    "place_id",
    "place_name",
    "old_photo_url",
    "new_photo_url",
    "status",
    "notes",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        String(r.place_id),
        r.place_name,
        r.old_photo_url,
        r.new_photo_url,
        r.status,
        r.notes,
      ]
        .map(csvEscape)
        .join(",")
    );
  }
  fs.writeFileSync(REPORT_PATH, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  loadEnv();

  const config: Config = {
    supabaseUrl: required("SUPABASE_URL"),
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    googleMapsApiKey: required("GOOGLE_MAPS_API_KEY"),
    bucket: "place-photos",
    limit: args.limit,
    placeIds: args.placeIds,
    dryRun: args.dryRun,
    delayMs: args.delayMs,
  };

  const { rows: places, photoCol } = await fetchPlaces(config);
  if (!places.length) {
    console.log("No places found.");
    writeReport([]);
    return;
  }
  console.log(
    `Loaded ${places.length} places. mode=${config.dryRun ? "dry-run" : "live"} photo_column=${photoCol}`
  );

  const report: ReportRow[] = [];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < places.length; i += 1) {
    const place = places[i];
    const oldPhoto = String(place[photoCol] ?? "");
    const baseRow: ReportRow = {
      place_id: place.id,
      place_name: place.name,
      old_photo_url: oldPhoto,
      new_photo_url: "",
      status: "failed",
      notes: "",
    };

    try {
      const candidates = await searchGoogleCandidates(config.googleMapsApiKey, place);
      const candidateIds: string[] = [];
      if (place.google_place_id) candidateIds.push(place.google_place_id);
      for (const candidate of candidates) {
        if (!candidateIds.includes(candidate.id)) candidateIds.push(candidate.id);
      }
      if (!candidateIds.length) throw new Error("no_match");

      let newPublicUrl = "";
      let lastReason = "no_viable_candidate";
      for (const candidateId of candidateIds) {
        const ownerId = await findPlaceIdOwner(config, candidateId);
        if (ownerId !== null && ownerId !== place.id) {
          lastReason = `candidate_taken:${candidateId}:owner=${ownerId}`;
          continue;
        }

        try {
          const details = await getPlaceDetails(config.googleMapsApiKey, candidateId);
          const cover = pickCoverPhoto(details);
          if (!cover) {
            lastReason = `no_photos:${candidateId}`;
            continue;
          }

          if (config.dryRun) {
            newPublicUrl = buildPublicUrl(config.supabaseUrl, config.bucket, buildStoragePath(place.id));
          } else {
            const photoBytes = await downloadGooglePhoto(config.googleMapsApiKey, cover);
            const objectPath = buildStoragePath(place.id);
            await uploadToSupabaseStorage(config, objectPath, photoBytes);
            newPublicUrl = buildPublicUrl(config.supabaseUrl, config.bucket, objectPath);
            await updatePlaceRow(config, place.id, photoCol, newPublicUrl, candidateId);
          }
          lastReason = "ok";
          break;
        } catch (candidateErr) {
          const msg = candidateErr instanceof Error ? candidateErr.message : String(candidateErr);
          if (isDuplicateGooglePlaceIdError(msg)) {
            lastReason = `candidate_conflict:${candidateId}`;
            continue;
          }
          throw candidateErr;
        }
      }

      if (lastReason !== "ok") {
        throw new Error(lastReason);
      }

      success += 1;
      report.push({
        ...baseRow,
        new_photo_url: newPublicUrl,
        status: "updated",
        notes: config.dryRun ? "dry-run (no upload/db update)" : "ok",
      });
      console.log(`[${i + 1}/${places.length}] Updated ${place.name}`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      report.push({ ...baseRow, status: "failed", notes: message });
      console.log(`[${i + 1}/${places.length}] Failed ${place.name}: ${message}`);
    }

    if (i < places.length - 1 && config.delayMs > 0) await sleep(config.delayMs);
  }

  writeReport(report);
  console.log(
    `Done. updated=${success} failed=${failed} report=${path.relative(process.cwd(), REPORT_PATH)}`
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exit(1);
});
