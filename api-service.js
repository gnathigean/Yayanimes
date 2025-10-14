// api-service.js - CORRIGIDO PARA A API falcon71181
// ===========================
// CONFIGURAÇÃO DA API
// ===========================

const API_BASE_URL = "https://novaapi-seven.vercel.app";

// ===========================
// REQUISIÇÕES À API
// ===========================

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
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

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Resposta de ${endpoint}:`, data);
    return data;
  } catch (error) {
    console.error(`❌ Erro na requisição ${url}:`, error);
    throw error;
  }
}

// ===========================
// API METHODS
// ===========================

window.AnimeAPI = {
  // Homepage - Retorna todos os animes em destaque
  async loadContentForHomepage() {
    try {
      console.log("📦 Carregando homepage...");
      const data = await apiRequest("/aniwatch/");

      // Transformar resposta para formato esperado
      return {
        status: 200,
        data: {
          spotlightAnimes: data.spotlightAnimes || [],
          trendingAnimes: data.trendingAnimes || [],
          latestEpisodeAnimes: data.latestEpisodeAnimes || [],
          topUpcomingAnimes: data.topUpcomingAnimes || [],
          top10Animes: data.top10Animes || { today: [], week: [], month: [] },
          topAiringAnimes: data.topAiringAnimes || [],
          mostPopularAnimes: data.mostPopularAnimes || [],
          mostFavoriteAnimes: data.mostFavoriteAnimes || [],
          latestCompletedAnimes: data.latestCompletedAnimes || [],
        },
      };
    } catch (error) {
      console.error("❌ Erro ao carregar homepage:", error);
      throw error;
    }
  },

  // Buscar animes
  async searchAnimes(query, page = 1) {
    try {
      console.log(`🔍 Buscando: "${query}" - Página ${page}`);
      const data = await apiRequest(
        `/aniwatch/search?keyword=${encodeURIComponent(query)}&page=${page}`
      );

      return {
        status: 200,
        data: {
          animes: data.animes || [],
          currentPage: data.currentPage || page,
          hasNextPage: data.hasNextPage || false,
          totalPages: data.totalPages || 1,
          searchQuery: query,
          searchFilters: data.searchFilters || {},
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar animes:", error);
      throw error;
    }
  },

  // Info do anime
  async getAnimeInfo(animeId) {
    try {
      console.log(`📺 Buscando info: ${animeId}`);
      const cleanId = animeId.split("?")[0].trim();
      const data = await apiRequest(`/aniwatch/anime/${cleanId}`);

      return {
        status: 200,
        data: {
          anime: data.anime || {},
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar info do anime:", error);
      throw error;
    }
  },

  // Episódios do anime
  async getAnimeEpisodes(animeId) {
    try {
      console.log(`📋 Buscando episódios: ${animeId}`);
      const cleanId = animeId.split("?")[0].trim();
      const data = await apiRequest(`/aniwatch/episodes/${cleanId}`);

      return {
        status: 200,
        data: {
          totalEpisodes: data.totalEpisodes || 0,
          episodes: data.episodes || [],
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar episódios:", error);
      throw error;
    }
  },

  // Servidores de um episódio
  async getEpisodeServers(episodeId) {
    try {
      console.log(`🖥️ Buscando servidores: ${episodeId}`);
      const data = await apiRequest(
        `/aniwatch/servers?id=${encodeURIComponent(episodeId)}`
      );

      return {
        status: 200,
        data: {
          episodeId: data.episodeId || episodeId,
          episodeNo: data.episodeNo || 0,
          sub: data.sub || [],
          dub: data.dub || [],
          raw: data.raw || [],
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar servidores:", error);
      throw error;
    }
  },

  // Streams de um episódio
  async getEpisodeStreams(episodeId, server = "hd-1", category = "sub") {
    try {
      console.log(`🎬 Buscando streams: ${episodeId} - Servidor: ${server}`);
      const data = await apiRequest(
        `/aniwatch/episode-srcs?id=${encodeURIComponent(
          episodeId
        )}&server=${server}&category=${category}`
      );

      return {
        status: 200,
        data: {
          tracks: data.tracks || [],
          intro: data.intro || { start: 0, end: 0 },
          outro: data.outro || { start: 0, end: 0 },
          sources: data.sources || [],
          anilistID: data.anilistID || null,
          malID: data.malID || null,
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar streams:", error);
      throw error;
    }
  },

  // Animes por categoria
  async getAnimeByCategory(category, page = 1) {
    try {
      console.log(`📂 Buscando categoria: ${category} - Página ${page}`);
      const data = await apiRequest(`/aniwatch/${category}?page=${page}`);

      return {
        status: 200,
        data: {
          category: data.category || category,
          animes: data.animes || [],
          currentPage: data.currentPage || page,
          hasNextPage: data.hasNextPage || false,
          totalPages: data.totalPages || 1,
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar categoria:", error);
      throw error;
    }
  },

  // Lista A-Z
  async getAZList(page = 1) {
    try {
      console.log(`🔤 Buscando lista A-Z - Página ${page}`);
      const data = await apiRequest(`/aniwatch/az-list?page=${page}`);

      return {
        status: 200,
        data: data,
      };
    } catch (error) {
      console.error("❌ Erro ao buscar lista A-Z:", error);
      throw error;
    }
  },

  // GogoAnime - Homepage
  async getGogoHome() {
    try {
      console.log("🏠 Carregando GogoAnime home...");
      const data = await apiRequest("/gogoanime/home");
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao carregar GogoAnime home:", error);
      throw error;
    }
  },

  // GogoAnime - Busca
  async searchGogoAnime(query, page = 1) {
    try {
      console.log(`🔍 Buscando no GogoAnime: "${query}"`);
      const data = await apiRequest(
        `/gogoanime/search?keyword=${encodeURIComponent(query)}&page=${page}`
      );
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar no GogoAnime:", error);
      throw error;
    }
  },

  // GogoAnime - Info
  async getGogoAnimeInfo(animeId) {
    try {
      console.log(`📺 Buscando info GogoAnime: ${animeId}`);
      const data = await apiRequest(`/gogoanime/anime/${animeId}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar info GogoAnime:", error);
      throw error;
    }
  },

  // GogoAnime - Lançamentos recentes
  async getGogoRecentReleases(page = 1) {
    try {
      const data = await apiRequest(`/gogoanime/recent-releases?page=${page}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar lançamentos recentes:", error);
      throw error;
    }
  },

  // GogoAnime - Novas temporadas
  async getGogoNewSeasons(page = 1) {
    try {
      const data = await apiRequest(`/gogoanime/new-seasons?page=${page}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar novas temporadas:", error);
      throw error;
    }
  },

  // GogoAnime - Populares
  async getGogoPopular(page = 1) {
    try {
      const data = await apiRequest(`/gogoanime/popular?page=${page}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar populares:", error);
      throw error;
    }
  },

  // GogoAnime - Completados
  async getGogoCompleted(page = 1) {
    try {
      const data = await apiRequest(`/gogoanime/completed?page=${page}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar completados:", error);
      throw error;
    }
  },

  // GogoAnime - Filmes
  async getGogoMovies(page = 1) {
    try {
      const data = await apiRequest(`/gogoanime/anime-movies?page=${page}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar filmes:", error);
      throw error;
    }
  },

  // GogoAnime - Top Airing
  async getGogoTopAiring(page = 1) {
    try {
      const data = await apiRequest(`/gogoanime/top-airing?page=${page}`);
      return { status: 200, data };
    } catch (error) {
      console.error("❌ Erro ao buscar top airing:", error);
      throw error;
    }
  },
};

// ===========================
// TESTE DE CONEXÃO
// ===========================

async function testAPIConnection() {
  console.log("🧪 Testando conexão com a API...");
  try {
    const result = await window.AnimeAPI.loadContentForHomepage();
    console.log("✅ API funcionando corretamente!");
    console.log("📊 Dados recebidos:", result);
    return true;
  } catch (error) {
    console.error("❌ Falha ao conectar com a API:", error);
    return false;
  }
}

// Expor globalmente
window.testAPIConnection = testAPIConnection;

console.log("✅ API Service carregado!");
console.log("🔗 API Base URL:", API_BASE_URL);
console.log("📋 Endpoints disponíveis:", Object.keys(window.AnimeAPI));

// Teste automático (opcional - descomente para ativar)
// setTimeout(() => testAPIConnection(), 1000);
