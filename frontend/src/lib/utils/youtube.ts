const YOUTUBE_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
];

export function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function parseTimeToSeconds(value: string): number | null {
  if (/^\d+$/.test(value)) {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  const hms = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!hms || !(hms[1] || hms[2] || hms[3])) return null;
  const h = Number.parseInt(hms[1] ?? "0", 10);
  const m = Number.parseInt(hms[2] ?? "0", 10);
  const s = Number.parseInt(hms[3] ?? "0", 10);
  return h * 3600 + m * 60 + s;
}

export function extractYouTubeStartSeconds(url: string): number | null {
  let rawValue: string | null = null;
  try {
    const normalized = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(normalized);
    rawValue =
      parsed.searchParams.get("t") ?? parsed.searchParams.get("start") ?? null;
  } catch {
    const match = url.match(/[?&](?:t|start)=([^&#]+)/);
    rawValue = match?.[1] ?? null;
  }

  if (!rawValue) return null;

  const seconds = parseTimeToSeconds(rawValue);
  return seconds !== null && seconds >= 0 ? seconds : null;
}

export function parseYouTubeUrl(
  url: string,
): { videoId: string; startSeconds: number | null } | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return { videoId, startSeconds: extractYouTubeStartSeconds(url) };
}

export function buildYouTubeEmbedSrc(url: string): string | null {
  const parsed = parseYouTubeUrl(url);
  if (!parsed) return null;
  const base = `https://www.youtube-nocookie.com/embed/${parsed.videoId}`;
  return parsed.startSeconds !== null
    ? `${base}?start=${parsed.startSeconds}`
    : base;
}
