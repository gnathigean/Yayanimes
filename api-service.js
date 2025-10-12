// api-service.js
// Serviço para integração com SugoiAPI (https://github.com/yzPeedro/SugoiAPI)

// ===========================
// CONFIGURAÇÃO DA SUGOI API
// ===========================

const API_CONFIG = {
  // URL base da SugoiAPI
  baseURL: "https://sugoi-api.vercel.app/anime",

  headers: {
    "Content-Type": "application/json",
  },

  // Cache de requisições (em segundos)
  cacheTime: 300, // 5 minutos

  // Endpoints disponíveis
  endpoints: {
    popular: "/popular", // Animes populares
    recent: "/recent", // Animes recentes
    search: "/search", // Buscar animes
    info: "/info", // Informações do anime
    episodes: "/episodes", // Episódios de um anime
    watch: "/watch", // Links de reprodução
  },
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

    const data = await response.json();

    console.log("✅ Resposta recebida:", {
      endpoint,
      type: typeof data,
      isArray: Array.isArray(data),
      keys: Object.keys(data).slice(0, 5),
      length: Array.isArray(data) ? data.length : "N/A",
      firstItem: Array.isArray(data) ? data[0] : data.results?.[0],
    });

    // Salvar no cache
    cache.set(cacheKey, data, API_CONFIG.cacheTime);

    return data;
  } catch (error) {
    console.error("❌ Erro na API:", error);
    throw error;
  }
}

// ===========================
// FUNÇÕES ESPECÍFICAS - SUGOI API
// ===========================

// Buscar animes populares
async function getPopularAnimes(page = 1) {
  return await apiRequest(`/popular?page=${page}`);
}

// Buscar animes recentes
async function getRecentAnimes(page = 1) {
  return await apiRequest(`/recent?page=${page}`);
}

// Buscar anime por query
async function searchAnimes(query) {
  const encodedQuery = encodeURIComponent(query);
  return await apiRequest(`/search?query=${encodedQuery}`);
}

// Buscar informações detalhadas do anime
async function getAnimeInfo(animeId) {
  return await apiRequest(`/info/${animeId}`);
}

// Buscar episódios de um anime
async function getAnimeEpisodes(animeId) {
  return await apiRequest(`/episodes/${animeId}`);
}

// Buscar links de reprodução de um episódio
async function getEpisodeWatch(episodeId) {
  return await apiRequest(`/watch/${episodeId}`);
}

// Função legada (mantida para compatibilidade)
async function getAnimes(params = {}) {
  // SugoiAPI não tem endpoint /animes, usar /popular
  return await getPopularAnimes(params.page || 1);
}

// Função legada
async function getAnimeById(id) {
  return await getAnimeInfo(id);
}

// Função legada
async function getEpisodes(animeId) {
  return await getAnimeEpisodes(animeId);
}

// Função legada
async function getEpisode(animeId, episodeId) {
  return await getEpisodeWatch(episodeId);
}

// Não aplicável para SugoiAPI (focada em animes)
async function getAnimesByGenre(genre, page = 1) {
  // SugoiAPI não tem busca por gênero específica
  // Usar busca normal
  return await searchAnimes(genre);
}

async function getMovies(page = 1) {
  // SugoiAPI é focada em animes, usar recent como alternativa
  return await getRecentAnimes(page);
}

async function getSeries(page = 1) {
  // SugoiAPI é focada em animes, usar popular como alternativa
  return await getPopularAnimes(page);
}

// ===========================
// NORMALIZAÇÃO DE DADOS - SUGOI API
// ===========================

// Adaptar dados da SugoiAPI para o formato do site
function normalizeAnimeData(apiData) {
  // Estrutura da SugoiAPI:
  // {
  //   id: string,
  //   title: string,
  //   image: string,
  //   releaseDate: string,
  //   totalEpisodes: number,
  //   rating: number,
  //   genres: string[],
  //   description: string
  // }

  return {
    id: apiData.id || apiData.animeId,
    title: apiData.title || apiData.name || "Sem título",
    rating: parseFloat(apiData.rating) || 0,
    year: extractYear(apiData.releaseDate),
    episodes: apiData.totalEpisodes || apiData.episodes || 0,
    image:
      apiData.image ||
      apiData.thumbnail ||
      "https://via.placeholder.com/400x600?text=No+Image",
    type: "anime",
    description:
      apiData.description || apiData.synopsis || "Descrição não disponível",
    genres: apiData.genres || [],
    status: apiData.status || "ongoing",
    new: isNew(apiData.releaseDate),
    releaseDate: apiData.releaseDate,
  };
}

// Extrair ano da data de lançamento
function extractYear(releaseDate) {
  if (!releaseDate) return new Date().getFullYear();

  try {
    // Pode vir como "2023", "2023-01-01", ou outros formatos
    const year = parseInt(releaseDate.toString().substring(0, 4));
    return isNaN(year) ? new Date().getFullYear() : year;
  } catch (e) {
    return new Date().getFullYear();
  }
}

// Verificar se é novo (lançado nos últimos 6 meses)
function isNew(releaseDate) {
  if (!releaseDate) return false;

  const release = new Date(releaseDate);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return release > sixMonthsAgo;
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
    console.log("📡 Buscando animes da SugoiAPI...");

    // SugoiAPI retorna direto os animes em formato { results: [...] }
    const [popularData, recentData] = await Promise.all([
      getPopularAnimes(1),
      getRecentAnimes(1),
    ]);

    console.log("✅ Dados recebidos:", { popularData, recentData });

    // A SugoiAPI retorna { results: [...] } ou array direto
    const popular = popularData.results || popularData;
    const recent = recentData.results || recentData;

    // Garantir que são arrays
    const popularArray = Array.isArray(popular) ? popular : [];
    const recentArray = Array.isArray(recent) ? recent : [];

    console.log(`📊 Popular: ${popularArray.length} animes`);
    console.log(`📊 Recentes: ${recentArray.length} animes`);

    return {
      animes: normalizeAnimeList(popularArray.slice(0, 12)),
      movies: normalizeAnimeList(recentArray.slice(0, 6)),
      series: normalizeAnimeList(popularArray.slice(6, 12)),
    };
  } catch (error) {
    console.error("❌ Erro ao carregar da SugoiAPI:", error.message);

    // Retornar dados vazios em caso de erro
    return {
      animes: [],
      movies: [],
      series: [],
    };
  }
}

// Buscar com paginação
async function loadMoreContent(type, page) {
  try {
    let data;

    switch (type) {
      case "anime":
        data = await getAnimes({ page, limit: 20 });
        break;
      case "movie":
        data = await getMovies(page);
        break;
      case "series":
        data = await getSeries(page);
        break;
      default:
        throw new Error("Tipo inválido");
    }

    return {
      items: normalizeAnimeList(data.data || data.results || data),
      hasMore: data.hasNextPage || data.currentPage < data.totalPages,
      currentPage: data.currentPage || page,
      totalPages: data.totalPages || 1,
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
      getAnimeEpisodes(animeId).catch(() => []),
    ]);

    const normalized = normalizeAnimeData(info);

    // Normalizar episódios da SugoiAPI
    const episodesList = Array.isArray(episodes)
      ? episodes
      : episodes.episodes || [];

    return {
      ...normalized,
      episodes: episodesList.map((ep, index) => ({
        id: ep.id || ep.episodeId,
        number: ep.number || index + 1,
        title: ep.title || `Episódio ${index + 1}`,
        thumbnail: ep.image || normalized.image,
        duration: "24 min", // SugoiAPI não retorna duração
      })),
    };
  } catch (error) {
    console.error("Erro ao carregar detalhes da SugoiAPI:", error);
    throw error;
  }
}

// Carregar links de reprodução do episódio
async function loadEpisodeStreams(episodeId) {
  try {
    const data = await getEpisodeWatch(episodeId);

    // SugoiAPI retorna { sources: [...], download: "..." }
    return {
      sources: data.sources || [],
      download: data.download || "",
    };
  } catch (error) {
    console.error("Erro ao carregar streams:", error);
    return { sources: [], download: "" };
  }
}

// ===========================
// TRATAMENTO DE ERROS
// ===========================

class APIError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "APIError";
    this.status = status;
    this.data = data;
  }
}

// Mostrar erro para o usuário
function showErrorToUser(error) {
  let message = "Erro ao carregar dados. Tente novamente.";

  if (error.message.includes("Failed to fetch")) {
    message = "Sem conexão com a internet. Verifique sua conexão.";
  } else if (error.status === 404) {
    message = "Conteúdo não encontrado.";
  } else if (error.status === 429) {
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
  `;
  notification.innerHTML = `
    <strong>❌ Erro</strong><br>
    ${message}
  `;

  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

// ===========================
// EXPORTAR FUNÇÕES
// ===========================

window.AnimeAPI = {
  // Configuração
  setBaseURL: (url) => {
    API_CONFIG.baseURL = url;
  },
  setHeaders: (headers) => {
    Object.assign(API_CONFIG.headers, headers);
  },

  // Cache
  clearCache: () => cache.clear(),

  // Requisições SugoiAPI
  getPopularAnimes,
  getRecentAnimes,
  searchAnimes,
  getAnimeInfo,
  getAnimeEpisodes,
  getEpisodeWatch,

  // Funções legadas (compatibilidade)
  getAnimes,
  getAnimeById,
  getEpisodes,
  getEpisode,
  getAnimesByGenre,
  getMovies,
  getSeries,

  // Alto nível
  loadContentForHomepage,
  loadMoreContent,
  loadAnimeDetails,
  loadEpisodeStreams,

  // Utilitários
  normalizeAnimeData,
  normalizeAnimeList,
  showErrorToUser,
};

console.log("✅ SugoiAPI Service carregado!");
