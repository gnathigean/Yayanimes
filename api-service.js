// api-service.js - JIKAN + HIANIME API (CORRIGIDO)

const JIKAN_URL = "https://api.jikan.moe/v4";
const HIANIME_API_URL = "https://hiaapi-production.up.railway.app";

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

async function searchHiAnime(query, page = 1) {
  // CORREÇÃO: rota correta é /anime/search
  const url = `${HIANIME_API_URL}/anime/search?q=${encodeURIComponent(
    query
  )}&page=${page}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: data,
  };
}

async function getEpisodes(animeId) {
  const url = `${HIANIME_API_URL}/anime/episodes/${animeId}`;
  const data = await apiRequest(url);
  return {
    success: true,
    data: data.episodes || [],
  };
}

async function getStreamingLink(animeId, episodeNumber) {
  // Primeiro busca ID do episódio
  const episodesData = await getEpisodes(animeId);
  const episode = episodesData.data.find((ep) => ep.number === episodeNumber);

  if (!episode) {
    return {
      success: false,
      error: "Episódio não encontrado",
    };
  }

  const url = `${HIANIME_API_URL}/anime/episode-srcs?id=${episode.episodeId}`;
  const data = await apiRequest(url);

  // Pega o primeiro link de streaming disponível
  const streamingLink = data.sources?.[0]?.url || null;

  return {
    success: !!streamingLink,
    data: {
      streamingLink,
      episode: episode,
      allSources: data.sources,
    },
  };
}

// Exporta para window
window.AnimeAPI = {
  search,
  getTopAiring,
  getCurrentSeason,
  getAnimeById,
  searchHiAnime,
  getEpisodes,
  getStreamingLink,
};

console.log("✅ API carregada (HiAnime + Jikan)!");
console.log("🔗 Jikan:", JIKAN_URL);
console.log("🎬 HiAnime API:", HIANIME_API_URL);
