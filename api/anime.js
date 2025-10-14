// api-service.js - VERSÃO CORRIGIDA

// IMPORTANTE: Use a URL que está funcionando no seu console
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
  // Homepage - CORRIGIDO para usar /aniwatch/
  async loadContentForHomepage() {
    try {
      const data = await apiRequest("/aniwatch/");
      return {
        status: 200,
        data: data
      };
    } catch (error) {
      console.error("Erro ao carregar homepage:", error);
      throw error;
    }
  },

  // Buscar animes
  async searchAnimes(query, page = 1) {
    try {
      const data = await apiRequest(
        `/aniwatch/search?q=${encodeURIComponent(query)}&page=${page}`
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
      const data = await apiRequest(`/aniwatch/anime/${cleanId}`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar info do anime:", error);
      throw error;
    }
  },

  // Episódios do anime
  async getAnimeEpisodes(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/aniwatch/anime/${cleanId}/episodes`);
      return data;
    } catch (error) {
      console.error("Erro ao buscar episódios:", error);
      throw error;
    }
  },

  // Servidores de um episódio
  async getEpisodeServers(episodeId) {
    try {
      const data = await apiRequest(
        `/aniwatch/episode/servers?animeEpisodeId=${episodeId}`
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
        `/aniwatch/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar streams:", error);
      throw error;
    }
  },

  // Categorias
  async getAnimeByCategory(category, page = 1) {
    try {
      const data = await apiRequest(
        `/aniwatch/category/${category}?page=${page}`
      );
      return data;
    } catch (error) {
      console.error("Erro ao buscar categoria:", error);
      throw error;
    }
  },

  // Gêneros disponíveis
  async getGenres() {
    try {
      const data = await apiRequest("/aniwatch/genre");
      return data;
    } catch (error) {
      console.error("Erro ao buscar gêneros:", error);
      throw error;
    }
  },

  // Produtores
  async getProducers() {
    try {
      const data = await apiRequest("/aniwatch/producer");
      return data;
    } catch (error) {
      console.error("Erro ao buscar produtores:", error);
      throw error;
    }
  },
};

console.log("✅ API Service corrigido e carregado!");
console.log("🔗 API Base:", API_BASE_URL);