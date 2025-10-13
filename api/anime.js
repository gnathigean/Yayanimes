// api-service.js - CORREÇÃO COMPLETA

const API_BASE_URL = "https://yayapi-delta.vercel.app/api/v2/hianime";

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
  // Homepage - FUNCIONANDO
  async loadContentForHomepage() {
    try {
      const data = await apiRequest("/home");
      return data;
    } catch (error) {
      console.error("Erro ao carregar homepage:", error);
      throw error;
    }
  },

  // Buscar animes - FUNCIONANDO
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

  // CORREÇÃO CRÍTICA: Info do anime
  async getAnimeInfo(animeId) {
    try {
      // Remover qualquer parâmetro extra e garantir formato correto
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/anime/${cleanId}`);
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
      const data = await apiRequest(`/anime/${cleanId}/episodes`);
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

console.log("✅ API Service carregado!");
console.log("📺 API Base:", API_BASE_URL);
