// api-service.js - VERSÃO COM FALLBACK LOCAL

const API_BASE_URL = "https://yayapi-delta.vercel.app/api/v2/hianime";

// ===========================
// SISTEMA DE CACHE PERSISTENTE
// ===========================

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

function getCachedData(key) {
  try {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const data = JSON.parse(cached);
    if (Date.now() - data.timestamp > CACHE_DURATION) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    console.log(`📦 Cache hit: ${key}`);
    return data.value;
  } catch (error) {
    return null;
  }
}

function setCachedData(key, value) {
  try {
    localStorage.setItem(
      `cache_${key}`,
      JSON.stringify({
        value,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("Erro ao salvar cache:", error);
  }
}

// ===========================
// CONTROLE DE RATE LIMIT
// ===========================

let rateLimitInfo = {
  isBlocked: false,
  unblockTime: 0,
  requestCount: 0,
  resetTime: Date.now() + 60000,
};

function canMakeRequest() {
  const now = Date.now();

  // Verificar se ainda está bloqueado
  if (rateLimitInfo.isBlocked && now < rateLimitInfo.unblockTime) {
    const waitTime = Math.ceil((rateLimitInfo.unblockTime - now) / 1000);
    console.warn(`⏳ Rate limit ativo. Aguarde ${waitTime}s`);
    return false;
  }

  // Resetar contadores se passou o tempo
  if (now > rateLimitInfo.resetTime) {
    rateLimitInfo.requestCount = 0;
    rateLimitInfo.resetTime = now + 60000;
    rateLimitInfo.isBlocked = false;
  }

  return true;
}

function blockRequests(seconds = 60) {
  rateLimitInfo.isBlocked = true;
  rateLimitInfo.unblockTime = Date.now() + seconds * 1000;
  console.warn(`🚫 Requisições bloqueadas por ${seconds}s`);
}

// ===========================
// REQUISIÇÕES À API
// ===========================

async function apiRequest(endpoint, options = {}) {
  const cacheKey = `${endpoint}-${JSON.stringify(options)}`;

  // 1. Tentar cache primeiro
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. Verificar rate limit
  if (!canMakeRequest()) {
    console.warn("⚠️ Usando dados em cache devido ao rate limit");
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  const url = `${API_BASE_URL}${endpoint}`;
  console.log(`📡 Requisição: ${url}`);

  rateLimitInfo.requestCount++;

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    if (response.status === 429) {
      console.error("❌ Rate limit atingido!");
      blockRequests(60); // Bloquear por 60 segundos
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Salvar no cache
    setCachedData(cacheKey, data);

    console.log(`✅ Resposta de ${endpoint}`);
    return data;
  } catch (error) {
    if (error.message === "RATE_LIMIT_EXCEEDED") {
      throw error;
    }
    console.error(`❌ Erro na requisição ${url}:`, error);
    throw error;
  }
}

// ===========================
// DADOS DE FALLBACK (MOCK)
// ===========================

const MOCK_DATA = {
  homepage: {
    status: 200,
    data: {
      spotlightAnimes: [
        {
          id: "one-piece-100",
          name: "One Piece",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/bcd84731a3eda4f4a306250769675065.jpg",
          rating: "9.5",
          episodes: { sub: 1122, dub: 1096 },
          type: "TV",
        },
        {
          id: "bleach-thousand-year-blood-war-the-conflict-19322",
          name: "Bleach: Thousand-Year Blood War - The Conflict",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/5bc8560e1d28ca217c9d5a4e83e02b0f.jpg",
          rating: "9.2",
          episodes: { sub: 13, dub: 0 },
          type: "TV",
        },
        {
          id: "dragon-ball-daima-19830",
          name: "Dragon Ball DAIMA",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/72f5894c9d5742fa2f6ac037fb20ab0a.jpg",
          rating: "8.9",
          episodes: { sub: 15, dub: 0 },
          type: "TV",
        },
      ],
      trendingAnimes: [
        {
          id: "solo-leveling-18718",
          name: "Solo Leveling",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/6b17ba80dc1dfa4fb4812d2bc1f6e999.jpg",
          rating: "9.3",
          episodes: { sub: 12, dub: 12 },
          type: "TV",
        },
        {
          id: "jujutsu-kaisen-2nd-season-18413",
          name: "Jujutsu Kaisen 2nd Season",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/4bcef2b91f0ed5bbb067f71dda44c0e5.jpg",
          rating: "9.1",
          episodes: { sub: 23, dub: 23 },
          type: "TV",
        },
        {
          id: "demon-slayer-kimetsu-no-yaiba-swordsmith-village-arc-18056",
          name: "Demon Slayer: Swordsmith Village Arc",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/b774c03241a3c34d5fc5f5a3e93d04f0.jpg",
          rating: "9.0",
          episodes: { sub: 11, dub: 11 },
          type: "TV",
        },
      ],
      mostPopularAnimes: [
        {
          id: "attack-on-titan-112",
          name: "Attack on Titan",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/e6ab5ccd4e6e96a7ca3cfb5609a02bf5.jpg",
          rating: "9.8",
          episodes: { sub: 87, dub: 87 },
          type: "TV",
        },
        {
          id: "fullmetal-alchemist-brotherhood-1",
          name: "Fullmetal Alchemist: Brotherhood",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/93d22af9595f8a18c7f4e97ec6323564.jpg",
          rating: "9.7",
          episodes: { sub: 64, dub: 64 },
          type: "TV",
        },
      ],
      latestEpisodeAnimes: [
        {
          id: "shangri-la-frontier-2nd-season-19367",
          name: "Shangri-La Frontier 2nd Season",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/3d71eefbe9dd8beae3417520e2ab3c6e.jpg",
          rating: "8.5",
          episodes: { sub: 15, dub: 0 },
          type: "TV",
        },
      ],
      topUpcomingAnimes: [
        {
          id: "wind-breaker-18749",
          name: "Wind Breaker",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/54b147cae87f1afe08e4293b7e8ba1cc.jpg",
          rating: "8.7",
          episodes: { sub: 13, dub: 0 },
          type: "TV",
        },
      ],
    },
  },
};

// ===========================
// MÓDULOS DA API
// ===========================

const anime = {
  // Homepage com fallback
  async loadContentForHomepage() {
    try {
      const data = await apiRequest("/home");
      return data;
    } catch (error) {
      if (error.message === "RATE_LIMIT_EXCEEDED") {
        console.warn("⚠️ Rate limit! Usando dados locais");
        return MOCK_DATA.homepage;
      }
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
  // Episódios do anime
  async getAnimeEpisodes(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/anime/${cleanId}/episodes`);

      console.log("📺 Estrutura de episódios:", data);

      if (data.data && data.data.episodes) {
        console.log(`✅ ${data.data.episodes.length} episódios extraídos`);
        return {
          status: data.status,
          totalEpisodes: data.data.totalEpisodes,
          episodes: data.data.episodes,
        };
      }

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
  async getGenres() {
    try {
      const data = await apiRequest("/genre");
      return data;
    } catch (error) {
      console.error("Erro ao buscar gêneros:", error);
      throw error;
    }
  },

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
console.log("💾 Cache duration:", CACHE_DURATION / 1000 / 60, "minutos");
