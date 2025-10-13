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

// SUBSTITUA O MOCK_DATA no api-service.js por este:

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
        {
          id: "my-hero-academia-final-season-19930",
          name: "My Hero Academia Final Season",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/d0cf8e5a8a7d03f0bf37a8abc2ff4e4e.jpg",
          rating: "8.8",
          episodes: { sub: 8, dub: 8 },
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
        {
          id: "frieren-beyond-journeys-end-18542",
          name: "Frieren: Beyond Journey's End",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/70093ab5e46b9826815ed2b5e30fd8d3.jpg",
          rating: "9.4",
          episodes: { sub: 28, dub: 28 },
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
        {
          id: "death-note-60",
          name: "Death Note",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/605e784b9dbb9d01d96fbb0c9f8e9cdb.jpg",
          rating: "9.6",
          episodes: { sub: 37, dub: 37 },
          type: "TV",
        },
      ],
      mostFavoriteAnimes: [
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
          id: "attack-on-titan-112",
          name: "Attack on Titan",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/e6ab5ccd4e6e96a7ca3cfb5609a02bf5.jpg",
          rating: "9.8",
          episodes: { sub: 87, dub: 87 },
          type: "TV",
        },
      ],
      top10Animes: {
        today: [
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
            id: "frieren-beyond-journeys-end-18542",
            name: "Frieren: Beyond Journey's End",
            poster:
              "https://cdn.noitatnemucod.net/thumbnail/300x400/100/70093ab5e46b9826815ed2b5e30fd8d3.jpg",
            rating: "9.4",
            episodes: { sub: 28, dub: 28 },
            type: "TV",
          },
        ],
      },
      topAiringAnimes: [
        {
          id: "bleach-thousand-year-blood-war-the-conflict-19322",
          name: "Bleach: Thousand-Year Blood War",
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
        {
          id: "my-hero-academia-final-season-19930",
          name: "My Hero Academia Final Season",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/d0cf8e5a8a7d03f0bf37a8abc2ff4e4e.jpg",
          rating: "8.8",
          episodes: { sub: 8, dub: 8 },
          type: "TV",
        },
      ],
      latestCompletedAnimes: [
        {
          id: "frieren-beyond-journeys-end-18542",
          name: "Frieren: Beyond Journey's End",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/70093ab5e46b9826815ed2b5e30fd8d3.jpg",
          rating: "9.4",
          episodes: { sub: 28, dub: 28 },
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
        {
          id: "kaiju-no-8-19280",
          name: "Kaiju No. 8",
          poster:
            "https://cdn.noitatnemucod.net/thumbnail/300x400/100/7d6e26e3e5ec5b7a1c2f5f3b7e8c9d4e.jpg",
          rating: "8.6",
          episodes: { sub: 12, dub: 0 },
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

  // ADICIONAR APÓS O MOCK_DATA.homepage (linha ~250):

  // Dados de animes individuais (para o player)
  animeDetails: {
    "one-piece-100": {
      status: 200,
      data: {
        anime: {
          info: {
            id: "one-piece-100",
            name: "One Piece",
            poster:
              "https://cdn.noitatnemucod.net/thumbnail/300x400/100/bcd84731a3eda4f4a306250769675065.jpg",
            description:
              "Monkey D. Luffy refuses to let anyone or anything stand in the way of his quest to become king of all pirates. With a course charted for the treacherous waters of the Grand Line, this is one captain who'll never drop anchor until he's claimed the greatest treasure on Earth—the Legendary One Piece!",
            rating: "9.5",
            jname: "One Piece",
            stats: {
              episodes: { sub: 1122, dub: 1096 },
              type: "TV",
              status: "Ongoing",
            },
          },
        },
      },
    },
    "my-hero-academia-final-season-19930": {
      status: 200,
      data: {
        anime: {
          info: {
            id: "my-hero-academia-final-season-19930",
            name: "My Hero Academia Final Season",
            poster:
              "https://cdn.noitatnemucod.net/thumbnail/300x400/100/d0cf8e5a8a7d03f0bf37a8abc2ff4e4e.jpg",
            description: "The final season of My Hero Academia.",
            rating: "8.8",
            jname: "Boku no Hero Academia",
            stats: {
              episodes: { sub: 8, dub: 8 },
              type: "TV",
              status: "Ongoing",
            },
          },
        },
      },
    },
    "solo-leveling-18718": {
      status: 200,
      data: {
        anime: {
          info: {
            id: "solo-leveling-18718",
            name: "Solo Leveling",
            poster:
              "https://cdn.noitatnemucod.net/thumbnail/300x400/100/6b17ba80dc1dfa4fb4812d2bc1f6e999.jpg",
            description:
              "In a world where hunters—human warriors who possess supernatural abilities—must battle deadly monsters to protect mankind from certain annihilation, a notoriously weak hunter named Sung Jinwoo finds himself in a seemingly endless struggle for survival.",
            rating: "9.3",
            jname: "Ore dake Level Up na Ken",
            stats: {
              episodes: { sub: 12, dub: 12 },
              type: "TV",
              status: "Completed",
            },
          },
        },
      },
    },
    "attack-on-titan-112": {
      status: 200,
      data: {
        anime: {
          info: {
            id: "attack-on-titan-112",
            name: "Attack on Titan",
            poster:
              "https://cdn.noitatnemucod.net/thumbnail/300x400/100/e6ab5ccd4e6e96a7ca3cfb5609a02bf5.jpg",
            description:
              "Several hundred years ago, humans were nearly exterminated by titans.",
            rating: "9.8",
            jname: "Shingeki no Kyojin",
            stats: {
              episodes: { sub: 87, dub: 87 },
              type: "TV",
              status: "Completed",
            },
          },
        },
      },
    },
  },

  // Episódios dos animes (para o player)
  animeEpisodes: {
    "one-piece-100": {
      status: 200,
      totalEpisodes: 1122,
      episodes: Array.from({ length: 20 }, (_, i) => ({
        title: `Episode ${i + 1}`,
        episodeId: `one-piece-100-episode-${i + 1}`,
        number: i + 1,
        isFiller: false,
      })),
    },
    "my-hero-academia-final-season-19930": {
      status: 200,
      totalEpisodes: 8,
      episodes: Array.from({ length: 8 }, (_, i) => ({
        title: `Episode ${i + 1}`,
        episodeId: `my-hero-academia-final-season-19930-episode-${i + 1}`,
        number: i + 1,
        isFiller: false,
      })),
    },
    "solo-leveling-18718": {
      status: 200,
      totalEpisodes: 12,
      episodes: Array.from({ length: 12 }, (_, i) => ({
        title: `Episode ${i + 1}`,
        episodeId: `solo-leveling-18718-episode-${i + 1}`,
        number: i + 1,
        isFiller: false,
      })),
    },
    "attack-on-titan-112": {
      status: 200,
      totalEpisodes: 87,
      episodes: Array.from({ length: 87 }, (_, i) => ({
        title: `Episode ${i + 1}`,
        episodeId: `attack-on-titan-112-episode-${i + 1}`,
        number: i + 1,
        isFiller: false,
      })),
    },
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

  // Info do anime - COM FALLBACK
  async getAnimeInfo(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/anime/${cleanId}`);
      return data;
    } catch (error) {
      if (error.message === "RATE_LIMIT_EXCEEDED") {
        console.warn(`⚠️ Rate limit! Usando dados locais para ${animeId}`);
        // Tentar buscar nos dados mock
        const mockData = MOCK_DATA.animeDetails[animeId];
        if (mockData) {
          return mockData;
        }
        // Se não tiver no mock, criar dados genéricos
        return {
          status: 200,
          data: {
            anime: {
              info: {
                id: animeId,
                name: "Anime (Modo Offline)",
                poster: "https://via.placeholder.com/300x400?text=Anime",
                description:
                  "Informações não disponíveis no momento. Por favor, tente novamente mais tarde.",
                rating: "N/A",
                stats: {
                  episodes: { sub: 0, dub: 0 },
                  type: "TV",
                  status: "Unknown",
                },
              },
            },
          },
        };
      }
      console.error("Erro ao buscar info do anime:", error);
      throw error;
    }
  },
};

const episodes = {
  // Episódios do anime - COM FALLBACK
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
      if (error.message === "RATE_LIMIT_EXCEEDED") {
        console.warn(`⚠️ Rate limit! Usando episódios locais para ${animeId}`);
        // Tentar buscar nos dados mock
        const mockEpisodes = MOCK_DATA.animeEpisodes[animeId];
        if (mockEpisodes) {
          return mockEpisodes;
        }
        // Se não tiver no mock, criar episódios genéricos
        return {
          status: 200,
          totalEpisodes: 12,
          episodes: Array.from({ length: 12 }, (_, i) => ({
            title: `Episode ${i + 1}`,
            episodeId: `${animeId}-episode-${i + 1}`,
            number: i + 1,
            isFiller: false,
          })),
        };
      }
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
