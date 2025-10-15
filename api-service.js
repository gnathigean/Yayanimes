// api-service.js - JIKAN + HIANIME API (COMPLETO)

const JIKAN_URL = "https://api.jikan.moe/v4";
const HIANIME_API_URL = "https://hiaapi-production.up.railway.app/api/v1";

async function apiRequest(url, options = {}, retries = 3) {
  console.log(`📡 GET ${url}`);
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeout);
      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`⚠️ Rate limit - aguardando...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log(`✅ Sucesso`);
      return data;
    } catch (error) {
      console.error(`❌ Tentativa ${i + 1}/${retries} falhou:`, error.message);
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

// =========================
// JIKAN API (MyAnimeList)
// =========================

async function search(query, page = 1, limit = 20) {
  const url = `${JIKAN_URL}/anime?q=${encodeURIComponent(
    query
  )}&page=${page}&limit=${limit}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: {
      currentPage: data.pagination?.current_page || page,
      hasNextPage: data.pagination?.has_next_page || false,
      results: data.data || [],
    },
  };
}

async function getTopAiring(page = 1, limit = 20) {
  const url = `${JIKAN_URL}/top/anime?filter=airing&page=${page}&limit=${limit}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: {
      currentPage: data.pagination?.current_page || page,
      hasNextPage: data.pagination?.has_next_page || false,
      results: data.data || [],
    },
  };
}

async function getCurrentSeason(page = 1, limit = 20) {
  const url = `${JIKAN_URL}/seasons/now?page=${page}&limit=${limit}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: {
      currentPage: data.pagination?.current_page || page,
      hasNextPage: data.pagination?.has_next_page || false,
      results: data.data || [],
    },
  };
}

async function getAnimeById(id) {
  const url = `${JIKAN_URL}/anime/${id}`;
  const data = await apiRequest(url);
  return { success: true, data: data.data };
}

// =========================
// HIANIME API (STREAMING)
// =========================

// 1. Home Page
async function getHomePage() {
  const url = `${HIANIME_API_URL}/home`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 2. Anime List by Category
async function getAnimesByCategory(query, category, page = 1) {
  const url = `${HIANIME_API_URL}/animes/${query}/${category}?page=${page}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 3. Anime Detailed Info
async function getAnimeInfo(animeId) {
  const url = `${HIANIME_API_URL}/anime/${animeId}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 4. Search Results
async function searchHiAnime(keyword, page = 1) {
  const url = `${HIANIME_API_URL}/search?keyword=${encodeURIComponent(
    keyword
  )}&page=${page}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 5. Search Suggestions (Autocomplete)
async function getSearchSuggestions(keyword) {
  const url = `${HIANIME_API_URL}/search/suggestion?keyword=${encodeURIComponent(
    keyword
  )}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 6. Anime Episodes
async function getEpisodes(animeId) {
  const url = `${HIANIME_API_URL}/episodes/${animeId}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: data.episodes || data.data || [],
  };
}

// 7. Episode Servers
async function getEpisodeServers(episodeId) {
  const url = `${HIANIME_API_URL}/servers?id=${episodeId}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 8. Streaming Links
async function getStreamingLink(
  episodeId,
  server = "vidstreaming",
  type = "sub"
) {
  const url = `${HIANIME_API_URL}/stream?id=${episodeId}&server=${server}&type=${type}`;
  const data = await apiRequest(url);

  // Pega o link de streaming (formato HLS m3u8)
  const streamingLink =
    data.sources?.find((s) => s.quality === "auto" || s.quality === "default")
      ?.url ||
    data.sources?.[0]?.url ||
    null;

  return {
    success: !!streamingLink,
    data: {
      streamingLink,
      allSources: data.sources || [],
      subtitles: data.subtitles || [],
      intro: data.intro || null,
      outro: data.outro || null,
    },
    error: streamingLink ? null : "Nenhum link de streaming disponível",
  };
}

// Exporta para window
window.AnimeAPI = {
  // Jikan (MyAnimeList)
  search,
  getTopAiring,
  getCurrentSeason,
  getAnimeById,

  // HiAnime API
  getHomePage,
  getAnimesByCategory,
  getAnimeInfo,
  searchHiAnime,
  getSearchSuggestions,
  getEpisodes,
  getEpisodeServers,
  getStreamingLink,
};

console.log("✅ API carregada (HiAnime + Jikan)!");
console.log("🔗 Jikan:", JIKAN_URL);
console.log("🎬 HiAnime API:", HIANIME_API_URL);
console.log("📋 Endpoints HiAnime disponíveis:");
console.log("  • Home: /home");
console.log("  • Animes: /animes/{query}/{category}?page={page}");
console.log("  • Info: /anime/{animeId}");
console.log("  • Busca: /search?keyword={keyword}&page={page}");
console.log("  • Sugestões: /search/suggestion?keyword={keyword}");
console.log("  • Episódios: /episodes/{animeId}");
console.log("  • Servidores: /servers?id={episodeId}");
console.log("  • Stream: /stream?id={episodeId}&server={server}&type={type}");
