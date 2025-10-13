// api-service.js
// Serviço para integração com Aniwatch API (https://github.com/ghoshRitesh12/aniwatch-api)

// ===========================
// CONFIGURAÇÃO DA ANIWATCH API
// ===========================

const API_CONFIG = {
  // URL base da Aniwatch API (já hospedada no Vercel)
  baseURL: "https://aniwatch-api-dusky.vercel.app/api/v2/hianime", // Altere para sua instância

  headers: {
    "Content-Type": "application/json",
  },

  // Cache de requisições (em segundos)
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

  // Verificar cache
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

    if (!result.success) {
      throw new Error(result.message || "Erro na API");
    }

    console.log("✅ Resposta recebida:", result);

    // Salvar no cache
    cache.set(cacheKey, result.data, API_CONFIG.cacheTime);

    return result.data;
  } catch (error) {
    console.error("❌ Erro na API:", error);
    throw error;
  }
}

// ===========================
// FUNÇÕES ESPECÍFICAS - ANIWATCH API
// ===========================

// Buscar página inicial com animes em destaque, populares, etc
async function getHomePage() {
  return await apiRequest("/home");
}

// Buscar animes por categoria
// Categorias: "most-favorite", "most-popular", "subbed-anime", "dubbed-anime",
// "recently-updated", "recently-added", "top-upcoming", "top-airing", "movie",
// "special", "ova", "ona", "tv", "completed"
async function getAnimesByCategory(category = "most-popular", page = 1) {
  return await apiRequest(`/category/${category}?page=${page}`);
}

// Buscar animes por gênero
async function getAnimesByGenre(genre, page = 1) {
  return await apiRequest(`/genre/${genre}?page=${page}`);
}

// Buscar anime por query (busca avançada disponível)
async function searchAnimes(query, page = 1, filters = {}) {
  let endpoint = `/search?q=${encodeURIComponent(query)}&page=${page}`;

  // Adicionar filtros se existirem
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

// Buscar sugestões de busca
async function getSearchSuggestions(query) {
  return await apiRequest(`/search/suggestion?q=${encodeURIComponent(query)}`);
}

// Buscar informações detalhadas do anime
async function getAnimeInfo(animeId) {
  return await apiRequest(`/anime/${animeId}`);
}

// Buscar episódios de um anime
async function getAnimeEpisodes(animeId) {
  return await apiRequest(`/anime/${animeId}/episodes`);
}

// Buscar servidores disponíveis para um episódio
async function getEpisodeServers(episodeId) {
  return await apiRequest(`/episode/servers?animeEpisodeId=${episodeId}`);
}

// Buscar links de streaming de um episódio
async function getEpisodeStreams(episodeId, server = "hd-1", category = "sub") {
  return await apiRequest(
    `/episode/sources?animeEpisodeId=${episodeId}&server=${server}&category=${category}`
  );
}

// Buscar agenda de lançamentos
async function getSchedule(date) {
  // date format: yyyy-mm-dd
  return await apiRequest(`/schedule?date=${date}`);
}

// Buscar lista A-Z
async function getAZList(letter = "all", page = 1) {
  return await apiRequest(`/azlist/${letter}?page=${page}`);
}

// ===========================
// NORMALIZAÇÃO DE DADOS
// ===========================

// Normalizar dados da Aniwatch API para o formato do site
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

// Extrair ano da string de data
function extractYear(airedString) {
  if (!airedString) return new Date().getFullYear();

  const match = airedString.match(/\d{4}/);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

// Verificar se é recente (últimos 6 meses)
function isRecent(airedString) {
  if (!airedString) return false;

  const year = extractYear(airedString);
  const currentYear = new Date().getFullYear();

  return year >= currentYear - 1;
}

// Normalizar lista de animes
function normalizeAnimeList(apiList) {
  if (!Array.isArray(apiList)) return [];
  return apiList.map((anime) => normalizeAnimeData(anime));
}

// ===========================
// FUNÇÕES DE ALTO NÍVEL
// ===========================

// Carregar conteúdo para a página principal
async function loadContentForHomepage() {
  try {
    console.log("📡 Buscando animes da Aniwatch API...");

    const homeData = await getHomePage();

    console.log("✅ Dados recebidos da home:", homeData);

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
    console.error("❌ Erro ao carregar da Aniwatch API:", error.message);
    throw error;
  }
}

// Buscar com paginação
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

// Buscar detalhes completos do anime
async function loadAnimeDetails(animeId) {
  try {
    const [info, episodes] = await Promise.all([
      getAnimeInfo(animeId),
      getAnimeEpisodes(animeId).catch(() => ({ episodes: [] })),
    ]);

    const normalized = normalizeAnimeData(info.anime.info);

    return {
      ...normalized,
      moreInfo: info.anime.moreInfo,
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

// Carregar episódio para reprodução
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
// FUNÇÕES DE COMPATIBILIDADE
// ===========================

// Funções legadas (compatibilidade com content-streaming.js)
async function getAnimes(params = {}) {
  const data = await getAnimesByCategory("most-popular", params.page || 1);
  return normalizeAnimeList(data.animes || []);
}

async function getAnimeById(id) {
  const data = await getAnimeInfo(id);
  return normalizeAnimeData(data.anime.info);
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
    message = "Sem conexão com a API. Verifique sua conexão.";
  } else if (error.message.includes("404")) {
    message = "Conteúdo não encontrado.";
  } else if (error.message.includes("429")) {
    message = "Muitas requisições. Aguarde um momento.";
  }

  // Criar notificação
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
    animation: slideIn 0.3s ease;
  `;
  notification.innerHTML = `
    <strong>❌ Erro</strong><br>
    ${message}
  `;

  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

// ===========================
// UTILITÁRIOS
// ===========================

// Obter data atual no formato yyyy-mm-dd
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Buscar agenda de hoje
async function getTodaySchedule() {
  try {
    return await getSchedule(getTodayDate());
  } catch (error) {
    console.error("Erro ao buscar agenda:", error);
    return { scheduledAnimes: [] };
  }
}

// ===========================
// EXPORTAR FUNÇÕES
// ===========================

window.AnimeAPI = {
  // Configuração
  setBaseURL: (url) => {
    API_CONFIG.baseURL = url;
    console.log(`✅ URL da API atualizada para: ${url}`);
  },

  // Cache
  clearCache: () => cache.clear(),

  // Requisições Aniwatch API
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

  // Funções legadas (compatibilidade)
  getAnimes,
  getAnimeById,
  getEpisodes,
  getMovies,
  getSeries,

  // Alto nível
  loadContentForHomepage,
  loadMoreContent,
  loadAnimeDetails,
  loadEpisodeForPlayer,

  // Utilitários
  normalizeAnimeData,
  normalizeAnimeList,
  showErrorToUser,
  getTodayDate,
};

console.log("✅ Aniwatch API Service carregado!");
console.log(
  "🔧 Para configurar URL customizada: window.AnimeAPI.setBaseURL('sua-url')"
);
console.log("📺 API Base: " + API_CONFIG.baseURL);
