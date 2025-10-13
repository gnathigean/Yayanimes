// api-service.js - VERSÃO COMPLETA E OTIMIZADA

const API_BASE_URL = "https://yayapi-delta.vercel.app/api/v2/hianime";

// ===========================
// SISTEMA DE CACHE E RATE LIMIT
// ===========================

const requestCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

let rateLimitInfo = {
  remaining: 100,
  resetTime: Date.now() + 60000,
  isWaiting: false,
};

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Verificar cache primeiro
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  const cached = requestCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`📦 Cache hit: ${endpoint}`);
    return cached.data;
  }

  // Aguardar se houver rate limit
  if (rateLimitInfo.isWaiting) {
    const waitTime = rateLimitInfo.resetTime - Date.now();
    if (waitTime > 0) {
      console.log(`⏳ Aguardando rate limit... ${Math.ceil(waitTime / 1000)}s`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      rateLimitInfo.isWaiting = false;
    }
  }

  console.log(`📡 Requisição: ${url}`);

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    // Atualizar info de rate limit dos headers
    const remaining = response.headers.get("X-RateLimit-Remaining");
    const reset = response.headers.get("X-RateLimit-Reset");

    if (remaining) rateLimitInfo.remaining = parseInt(remaining);
    if (reset) rateLimitInfo.resetTime = parseInt(reset) * 1000;

    if (response.status === 429) {
      console.warn("⚠️ Rate limit atingido!");
      rateLimitInfo.isWaiting = true;
      rateLimitInfo.resetTime = Date.now() + 60000; // 1 minuto padrão

      // Tentar novamente após esperar
      await new Promise((resolve) => setTimeout(resolve, 60000));
      return apiRequest(endpoint, options);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Salvar no cache
    requestCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    // Limpar cache antigo (manter apenas 50 itens)
    if (requestCache.size > 50) {
      const oldestKey = requestCache.keys().next().value;
      requestCache.delete(oldestKey);
    }

    console.log(`✅ Resposta de ${endpoint}`);
    return data;
  } catch (error) {
    console.error(`❌ Erro na requisição ${url}:`, error);
    throw error;
  }
}

// ===========================
// MÓDULOS DA API
// ===========================

const anime = {
  // Homepage
  async loadContentForHomepage() {
    try {
      const data = await apiRequest("/home");
      return data;
    } catch (error) {
      console.error("Erro ao carregar homepage:", error);
      throw error;
    }
  },

  // Buscar animes
  async searchAnimes(query, page = 1) {
    try {
      const data = await apiRequest(
        `/search?q=${encodeURIComponent(query)}&page=${page}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar animes:", error);
      throw error;
    }
  },

  // Info do anime
  async getAnimeInfo(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/anime/${cleanId}`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar info do anime:", error);
      throw error;
    }
  },
};

const episodes = {
  // Episódios do anime - CORRIGIDO
  async getAnimeEpisodes(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/anime/${cleanId}/episodes`);

      console.log("📺 Estrutura de episódios:", data);

      // A API retorna { status: 200, data: { totalEpisodes, episodes: [...] } }
      if (data.data && data.data.episodes) {
        console.log(`✅ ${data.data.episodes.length} episódios extraídos`);
        return {
          status: data.status,
          totalEpisodes: data.data.totalEpisodes,
          episodes: data.data.episodes,
        };
      }

      // Fallback
      return data;
    } catch (error) {
      console.error("Erro ao buscar episódios:", error);
      throw error;
    }
  },
};

const streaming = {
  // Servidores de um episódio
  async getEpisodeServers(episodeId) {
    try {
      const data = await apiRequest(
        `/episode/servers?animeEpisodeId=${episodeId}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar servidores:", error);
      throw error;
    }
  },

  // Streams de um episódio
  async getEpisodeStreams(episodeId, server = "hd-1", category = "sub") {
    try {
      const data = await apiRequest(
        `/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar streams:", error);
      throw error;
    }
  },
};

const search = {
  async searchAnimes(query, page = 1) {
    return anime.searchAnimes(query, page);
  },
};

const categories = {
  // Gêneros disponíveis
  async getGenres() {
    try {
      const data = await apiRequest("/genre");
      return data;
    } catch (error) {
      console.error("Erro ao buscar gêneros:", error);
      throw error;
    }
  },

  // Produtores
  async getProducers() {
    try {
      const data = await apiRequest("/producer");
      return data;
    } catch (error) {
      console.error("Erro ao buscar produtores:", error);
      throw error;
    }
  },
};

const schedules = {};
const auth = {};

// ===========================
// API GLOBAL
// ===========================

window.AnimeAPI = {
  loadContentForHomepage: anime.loadContentForHomepage,
  searchAnimes: anime.searchAnimes,
  getAnimeInfo: anime.getAnimeInfo,
  getAnimeEpisodes: episodes.getAnimeEpisodes,
  getEpisodeServers: streaming.getEpisodeServers,
  getEpisodeStreams: streaming.getEpisodeStreams,
  getGenres: categories.getGenres,
  getProducers: categories.getProducers,
};

// Expor API globalmente
window.apiService = {
  anime,
  episodes,
  streaming,
  search,
  categories,
  schedules,
  auth,
};

console.log("✅ API Service carregado!");
console.log("📺 API Base:", API_BASE_URL);
