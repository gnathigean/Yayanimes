// api-service.js - APENAS HIANIME API

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
// HIANIME API (COMPLETA)
// =========================

// 1. Home Page (animes em destaque)
async function getHomePage() {
  const url = `${HIANIME_API_URL}/home`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 2. Busca de animes
async function search(keyword, page = 1) {
  const url = `${HIANIME_API_URL}/search?keyword=${encodeURIComponent(
    keyword
  )}&page=${page}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: {
      currentPage: page,
      hasNextPage: data.hasNextPage || false,
      results: data.results || [],
    },
  };
}

// 3. Sugestões de busca (autocomplete)
async function getSearchSuggestions(keyword) {
  const url = `${HIANIME_API_URL}/search/suggestion?keyword=${encodeURIComponent(
    keyword
  )}`;
  const data = await apiRequest(url);
  return { success: true, data: data.suggestions || [] };
}

// 4. Detalhes do anime
async function getAnimeInfo(animeId) {
  const url = `${HIANIME_API_URL}/anime/${animeId}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 5. Lista de episódios
async function getEpisodes(animeId) {
  const url = `${HIANIME_API_URL}/episodes/${animeId}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: data.episodes || data.data || [],
  };
}

// 6. Servidores disponíveis
async function getEpisodeServers(episodeId) {
  const url = `${HIANIME_API_URL}/servers?id=${episodeId}`;
  const data = await apiRequest(url);
  return { success: true, data };
}

// 7. Link de streaming
async function getStreamingLink(
  episodeId,
  server = "vidstreaming",
  type = "sub"
) {
  const url = `${HIANIME_API_URL}/stream?id=${episodeId}&server=${server}&type=${type}`;
  const data = await apiRequest(url);

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

// 8. Animes por categoria
async function getAnimesByCategory(category = "tv", page = 1) {
  const url = `${HIANIME_API_URL}/animes/${category}?page=${page}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: {
      currentPage: page,
      hasNextPage: data.hasNextPage || false,
      results: data.results || [],
    },
  };
}

// Exporta para window
window.AnimeAPI = {
  getHomePage,
  search,
  getSearchSuggestions,
  getAnimeInfo,
  getEpisodes,
  getEpisodeServers,
  getStreamingLink,
  getAnimesByCategory,
};

console.log("✅ HiAnime API carregada!");
console.log("🎬 URL:", HIANIME_API_URL);
