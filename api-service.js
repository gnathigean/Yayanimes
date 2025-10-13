// api-service.js - VERSÃO FINAL CORRIGIDA

const API_BASE_URL = "https://yayapi-delta.vercel.app/api/v2/hianime";

// Cache de requisições
const apiCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  // Verificar cache
  const cached = apiCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`💾 Retornando do cache: ${endpoint}`);
    return cached.data;
  }

  console.log(`📡 Requisição: ${url}`);

  try {
    // Delay para evitar rate limit
    await new Promise((resolve) => setTimeout(resolve, 500));

    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("⚠️ Rate limit atingido. Aguardando 60s...");
        await new Promise((resolve) => setTimeout(resolve, 60000));
        return apiRequest(endpoint, options); // Tentar novamente
      }
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Resposta de ${endpoint}:`, data);

    // Salvar no cache
    apiCache.set(url, {
      data: data,
      timestamp: Date.now(),
    });

    return data;
  } catch (error) {
    console.error(`❌ Erro na requisição ${url}:`, error);

    // Se tiver cache antigo, usar
    const oldCache = apiCache.get(url);
    if (oldCache) {
      console.warn("⚠️ Usando cache antigo devido ao erro");
      return oldCache.data;
    }

    throw error;
  }
}

// ===========================
// API METHODS (TODOS OS ENDPOINTS)
// ===========================

window.AnimeAPI = {
  // 1. Homepage
  async loadContentForHomepage() {
    try {
      const data = await apiRequest("/home");
      return data;
    } catch (error) {
      console.error("Erro ao carregar homepage:", error);
      throw error;
    }
  },

  // 2. A-Z List
  async getAZList(sortOption = "a-z", page = 1) {
    try {
      const data = await apiRequest(`/azlist/${sortOption}?page=${page}`);
      return data;
    } catch (error) {
      console.error("Erro ao carregar A-Z list:", error);
      throw error;
    }
  },

  // 3. Anime Qtip Info (preview rápido)
  async getAnimeQtip(animeId) {
    try {
      const data = await apiRequest(`/qtip/${animeId}`);
      return data;
    } catch (error) {
      console.error("Erro ao carregar qtip:", error);
      throw error;
    }
  },

  // 4. Anime About Info (informações completas)
  async getAnimeInfo(animeId) {
    try {
      const data = await apiRequest(`/anime/${animeId}`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar info do anime:", error);
      throw error;
    }
  },

  // 5. Search (busca básica)
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

  // 6. Advanced Search (busca com filtros)
  async advancedSearch(options = {}) {
    try {
      const params = new URLSearchParams();

      if (options.query) params.append("q", options.query);
      if (options.page) params.append("page", options.page);
      if (options.genres) params.append("genres", options.genres);
      if (options.type) params.append("type", options.type);
      if (options.sort) params.append("sort", options.sort);
      if (options.season) params.append("season", options.season);
      if (options.language) params.append("language", options.language);
      if (options.status) params.append("status", options.status);
      if (options.rated) params.append("rated", options.rated);
      if (options.start_date) params.append("start_date", options.start_date);
      if (options.end_date) params.append("end_date", options.end_date);
      if (options.score) params.append("score", options.score);

      const data = await apiRequest(`/search?${params.toString()}`);
      return data;
    } catch (error) {
      console.error("Erro na busca avançada:", error);
      throw error;
    }
  },

  // 7. Search Suggestions
  async getSearchSuggestions(query) {
    try {
      const data = await apiRequest(
        `/search/suggestion?q=${encodeURIComponent(query)}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar sugestões:", error);
      throw error;
    }
  },

  // 8. Producer Animes
  async getProducerAnimes(producerName, page = 1) {
    try {
      const data = await apiRequest(
        `/producer/${encodeURIComponent(producerName)}?page=${page}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar animes do produtor:", error);
      throw error;
    }
  },

  // 9. Genre Animes
  async getGenreAnimes(genreName, page = 1) {
    try {
      const data = await apiRequest(
        `/genre/${encodeURIComponent(genreName)}?page=${page}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar animes do gênero:", error);
      throw error;
    }
  },

  // 10. Category Animes
  async getCategoryAnimes(categoryName, page = 1) {
    try {
      const data = await apiRequest(
        `/category/${encodeURIComponent(categoryName)}?page=${page}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar animes da categoria:", error);
      throw error;
    }
  },

  // 11. Schedule (cronograma)
  async getSchedule(date) {
    try {
      const dateParam = date ? `?date=${date}` : "";
      const data = await apiRequest(`/schedule${dateParam}`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar cronograma:", error);
      throw error;
    }
  },

  // 12. Anime Episodes
  async getAnimeEpisodes(animeId) {
    try {
      const data = await apiRequest(`/anime/${animeId}/episodes`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar episódios:", error);
      throw error;
    }
  },

  // 13. Next Episode Schedule
  async getNextEpisodeSchedule(animeId) {
    try {
      const data = await apiRequest(`/anime/${animeId}/next-episode-schedule`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar próximo episódio:", error);
      throw error;
    }
  },

  // 14. Episode Servers
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

  // 15. Episode Streaming Links
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

console.log("✅ API Service carregado!");
console.log("📺 API Base:", API_BASE_URL);
