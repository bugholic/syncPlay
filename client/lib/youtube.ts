export interface ParsedYouTubeUrl {
  type: "video" | "playlist" | "unknown";
  videoId: string | null;
  playlistId: string | null;
}

export function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
  const cleaned = url.trim();

  const videoPatterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  const playlistPatterns = [
    /(?:youtube\.com\/playlist\?.*list=)([a-zA-Z0-9_-]+)/,
    /(?:youtube\.com\/watch\?.*list=)([a-zA-Z0-9_-]+)/,
    /(?:music\.youtube\.com\/playlist\?.*list=)([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of playlistPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      const urlObj = new URL(cleaned.includes("://") ? cleaned : `https://${cleaned}`);
      const vParam = urlObj.searchParams.get("v");
      if (vParam && vParam.length === 11) {
        return { type: "video", videoId: vParam, playlistId: null };
      }
      return { type: "playlist", videoId: null, playlistId: match[1] };
    }
  }

  for (const pattern of videoPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      return { type: "video", videoId: match[1], playlistId: null };
    }
  }

  return { type: "unknown", videoId: null, playlistId: null };
}

export function isYouTubeUrl(text: string): boolean {
  return parseYouTubeUrl(text).type !== "unknown";
}
