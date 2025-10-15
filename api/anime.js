// api-service.js - VERSÃO FINAL CORRIGIDA
class AnimeAPI {
  constructor() {
    this.baseURL = "https://hiaapi-production.up.railway.app/api/v1";
    console.log("✅ HiAnime API carregada!");
    console.log("🎬 URL:", this.baseURL);
  }

  async request(endpoint) {
    console.log(`📡 GET ${this.baseURL}${endpoint}`);
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      console.log("✅ Sucesso");
      return data;
    } catch (error) {
      console.error("❌ Erro:", error);
      throw error;
    }
  }

  // HOME
  async getHomePage() {
    return this.request("/home");
  }

  // CATEGORIAS
  async getAnimesByCategory(category, page = 1) {
    const categoryMap = {
      "most-popular": "most-popular",
      "latest-completed": "completed",
      "top-airing": "top-airing",
      "top-upcoming": "top-upcoming",
      tv: "tv",
      movie: "movie",
      ona: "ona",
      ova: "ova",
      special: "special",
    };

    const mapped = categoryMap[category] || category;
    return this.request(`/anime/${mapped}?page=${page}`);
  }

  // GÊNERO
  async getAnimesByGenre(genreName, page = 1) {
    return this.request(`/anime/genre/${genreName}?page=${page}`);
  }

  // BUSCA
  async search(query, page = 1) {
    return this.request(
      `/anime/search?q=${encodeURIComponent(query)}&page=${page}`
    );
  }

  // DETALHES - CORRIGIDO
  async getAnimeDetails(animeId) {
    return this.request(`/anime/info?id=${animeId}`);
  }

  // EPISÓDIOS
  async getEpisodes(animeId) {
    return this.request(`/anime/episodes/${animeId}`);
  }

  // SERVIDORES
  async getEpisodeServers(episodeId) {
    return this.request(`/anime/servers?episodeId=${episodeId}`);
  }

  // STREAMING
  async getStreamingLinks(episodeId, server = "hd-1", category = "sub") {
    return this.request(
      `/anime/episode-srcs?id=${episodeId}&server=${server}&category=${category}`
    );
  }
}

window.AnimeAPI = new AnimeAPI();
