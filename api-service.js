const API_CONFIG = {
  baseURL: "https://yayapi-delta.vercel.app/api/v2/hianime",

  headers: {
    "Content-Type": "application/json",
  },

  cacheTime: 300, // 5 minutos
};

// ===========================
// SISTEMA DE CACHE
// ===========================

class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  set(key, data, ttl = 300) {
    const expiry = Date.now() + ttl * 1000;
    this.cache.set(key, { data, expiry });
  }

  get(key) {
    const cached = this.cache.get(key);

    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  remove(key) {
    this.cache.delete(key);
  }
}

const cache = new CacheManager();

// ===========================
// FUNÇÕES DE REQUISIÇÃO
// ===========================

async function apiRequest(endpoint, options = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;

  const cacheKey = `${endpoint}${JSON.stringify(options)}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    console.log("📦 Dados do cache:", endpoint);
    return cached;
  }

  try {
    console.log("🌐 Requisição:", url);

    const response = await fetch(url, {
      ...options,
      headers: {
        ...API_CONFIG.headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success && result.success !== undefined) {
      throw new Error(result.message || "Erro na API");
    }

    console.log("✅ Resposta recebida:", result);

    // Para endpoints que retornam dados diretamente (nosso backend proxy)
    const dataToCache = result.data || result;
    cache.set(cacheKey, dataToCache, API_CONFIG.cacheTime);

    return dataToCache;
  } catch (error) {
    console.error("❌ Erro na API:", error);
    throw error;
  }
}

// ===========================
// FUNÇÕES ESPECÍFICAS
// ===========================

async function getHomePage() {
  return await apiRequest("/home");
}

async function getAnimesByCategory(category = "most-popular", page = 1) {
  return await apiRequest(`/category/${category}?page=${page}`);
}

async function getAnimesByGenre(genre, page = 1) {
  return await apiRequest(`/genre/${genre}?page=${page}`);
}

async function searchAnimes(query, page = 1, filters = {}) {
  let endpoint = `/search?q=${encodeURIComponent(query)}&page=${page}`;

  if (filters.type) endpoint += `&type=${filters.type}`;
  if (filters.status) endpoint += `&status=${filters.status}`;
  if (filters.rated) endpoint += `&rated=${filters.rated}`;
  if (filters.score) endpoint += `&score=${filters.score}`;
  if (filters.season) endpoint += `&season=${filters.season}`;
  if (filters.language) endpoint += `&language=${filters.language}`;
  if (filters.genres) endpoint += `&genres=${filters.genres}`;
  if (filters.sort) endpoint += `&sort=${filters.sort}`;
  if (filters.start_date) endpoint += `&start_date=${filters.start_date}`;
  if (filters.end_date) endpoint += `&end_date=${filters.end_date}`;

  return await apiRequest(endpoint);
}

async function getSearchSuggestions(query) {
  return await apiRequest(`/search/suggestion?q=${encodeURIComponent(query)}`);
}

async function getAnimeInfo(animeId) {
  return await apiRequest(`/${animeId}`);
}

async function getAnimeEpisodes(animeId) {
  return await apiRequest(`/${animeId}/episodes`);
}

async function getEpisodeServers(episodeId) {
  return await apiRequest(`/episode/${episodeId}/servers`);
}

async function getEpisodeStreams(episodeId, server = "hd-1", category = "sub") {
  return await apiRequest(
    `/episode/${episodeId}/sources?server=${server}&category=${category}`
  );
}

async function getSchedule(date) {
  return await apiRequest(`/schedule?date=${date}`);
}

async function getAZList(letter = "all", page = 1) {
  return await apiRequest(`/azlist/${letter}?page=${page}`);
}

// ===========================
// NORMALIZAÇÃO DE DADOS
// ===========================

function normalizeAnimeData(apiData) {
  return {
    id: apiData.id,
    title: apiData.name || apiData.title,
    jname: apiData.jname,
    rating: parseFloat(apiData.rating || apiData.stats?.rating || 0),
    year: extractYear(apiData.moreInfo?.aired || apiData.aired),
    episodes: apiData.episodes?.sub || apiData.stats?.episodes?.sub || 0,
    episodesDub: apiData.episodes?.dub || apiData.stats?.episodes?.dub || 0,
    image: apiData.poster,
    type: apiData.type || "TV",
    description: apiData.description || "Descrição não disponível",
    genres: apiData.moreInfo?.genres || apiData.genres || [],
    status: apiData.moreInfo?.status || apiData.status,
    duration: apiData.duration || apiData.moreInfo?.duration,
    quality: apiData.quality || apiData.stats?.quality,
    new: isRecent(apiData.moreInfo?.aired || apiData.aired),
  };
}

function extractYear(airedString) {
  if (!airedString) return new Date().getFullYear();
  const match = airedString.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

function isRecent(airedString) {
  if (!airedString) return false;
  const year = extractYear(airedString);
  const currentYear = new Date().getFullYear();
  return year >= currentYear - 1;
}

function normalizeAnimeList(apiList) {
  if (!Array.isArray(apiList)) return [];
  return apiList.map((anime) => normalizeAnimeData(anime));
}

// ===========================
// FUNÇÕES DE ALTO NÍVEL
// ===========================

async function loadContentForHomepage() {
  try {
    console.log("🔡 Buscando animes do backend proxy...");

    const homeData = await getHomePage();
    console.log("✅ Dados recebidos:", homeData);

    return {
      animes: normalizeAnimeList(homeData.trendingAnimes || []),
      movies: normalizeAnimeList(
        homeData.latestEpisodeAnimes?.slice(0, 6) || []
      ),
      series: normalizeAnimeList(homeData.mostPopularAnimes?.slice(0, 6) || []),
      spotlight: normalizeAnimeList(homeData.spotlightAnimes || []),
      topAiring: normalizeAnimeList(homeData.topAiringAnimes || []),
      top10: homeData.top10Animes,
    };
  } catch (error) {
    console.error("❌ Erro ao carregar do backend:", error.message);
    throw error;
  }
}

async function loadMoreContent(type, page = 1) {
  try {
    let categoryMap = {
      anime: "most-popular",
      movie: "movie",
      series: "tv",
      recent: "recently-added",
      popular: "most-popular",
      airing: "top-airing",
    };

    const category = categoryMap[type] || "most-popular";
    const data = await getAnimesByCategory(category, page);

    return {
      items: normalizeAnimeList(data.animes || []),
      hasMore: data.hasNextPage,
      currentPage: data.currentPage,
      totalPages: data.totalPages,
    };
  } catch (error) {
    console.error("Erro ao carregar mais conteúdo:", error);
    return { items: [], hasMore: false };
  }
}

async function loadAnimeDetails(animeId) {
  try {
    const [info, episodes] = await Promise.all([
      getAnimeInfo(animeId),
      getAnimeEpisodes(animeId).catch(() => ({ episodes: [] })),
    ]);

    const normalized = normalizeAnimeData(info.anime?.info || info);

    return {
      ...normalized,
      moreInfo: info.anime?.moreInfo || info.moreInfo,
      episodes: episodes.episodes || [],
      totalEpisodes: episodes.totalEpisodes || 0,
      recommendedAnimes: normalizeAnimeList(info.recommendedAnimes || []),
      relatedAnimes: normalizeAnimeList(info.relatedAnimes || []),
      seasons: info.seasons || [],
    };
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    throw error;
  }
}

async function loadEpisodeForPlayer(
  episodeId,
  server = "hd-1",
  category = "sub"
) {
  try {
    const [servers, streams] = await Promise.all([
      getEpisodeServers(episodeId),
      getEpisodeStreams(episodeId, server, category),
    ]);

    return {
      episodeId: episodeId,
      episodeNo: servers.episodeNo,
      servers: servers,
      streams: streams,
      availableServers: {
        sub: servers.sub || [],
        dub: servers.dub || [],
        raw: servers.raw || [],
      },
    };
  } catch (error) {
    console.error("Erro ao carregar episódio:", error);
    throw error;
  }
}

// ===========================
// COMPATIBILIDADE
// ===========================

async function getAnimes(params = {}) {
  const data = await getAnimesByCategory("most-popular", params.page || 1);
  return normalizeAnimeList(data.animes || []);
}

async function getAnimeById(id) {
  const data = await getAnimeInfo(id);
  return normalizeAnimeData(data.anime?.info || data);
}

async function getEpisodes(animeId) {
  const data = await getAnimeEpisodes(animeId);
  return data.episodes || [];
}

async function getMovies(page = 1) {
  const data = await getAnimesByCategory("movie", page);
  return normalizeAnimeList(data.animes || []);
}

async function getSeries(page = 1) {
  const data = await getAnimesByCategory("tv", page);
  return normalizeAnimeList(data.animes || []);
}

// ===========================
// TRATAMENTO DE ERROS
// ===========================

function showErrorToUser(error) {
  let message = "Erro ao carregar dados. Tente novamente.";

  if (error.message.includes("Failed to fetch")) {
    message = "Sem conexão com o backend. Verifique se está rodando.";
  } else if (error.message.includes("404")) {
    message = "Conteúdo não encontrado.";
  } else if (error.message.includes("429")) {
    message = "Muitas requisições. Aguarde um momento.";
  }

  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #dc2626;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 300px;
  `;
  notification.innerHTML = `<strong>❌ Erro</strong><br>${message}`;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

// ===========================
// UTILITÁRIOS
// ===========================

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getTodaySchedule() {
  try {
    return await getSchedule(getTodayDate());
  } catch (error) {
    console.error("Erro ao buscar agenda:", error);
    return { scheduledAnimes: [] };
  }
}

// ===========================
// EXPORTAR
// ===========================

window.AnimeAPI = {
  setBaseURL: (url) => {
    API_CONFIG.baseURL = url;
    console.log(`✅ URL da API atualizada para: ${url}`);
  },
  clearCache: () => cache.clear(),
  getHomePage,
  getAnimesByCategory,
  getAnimesByGenre,
  searchAnimes,
  getSearchSuggestions,
  getAnimeInfo,
  getAnimeEpisodes,
  getEpisodeServers,
  getEpisodeStreams,
  getSchedule,
  getTodaySchedule,
  getAZList,
  getAnimes,
  getAnimeById,
  getEpisodes,
  getMovies,
  getSeries,
  loadContentForHomepage,
  loadMoreContent,
  loadAnimeDetails,
  loadEpisodeForPlayer,
  normalizeAnimeData,
  normalizeAnimeList,
  showErrorToUser,
  getTodayDate,
};

console.log("✅ API Service carregado!");
console.log("📺 API Base: " + API_CONFIG.baseURL);
