// api-service.js - COM PROXY PARA RESOLVER CORS

// 🔧 CONFIGURAÇÃO
const USE_PROXY = true; // Mude para false se resolver CORS na API
const API_BASE_URL = "https://novaapi-seven.vercel.app";
const PROXY_URL = "/api/proxy"; // Seu proxy local

// ===========================
// SISTEMA DE CACHE
// ===========================
const CACHE_DURATION = 60 * 60 * 1000; // 60 minutos

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
// REQUISIÇÕES À API
// ===========================
async function apiRequest(endpoint, options = {}) {
  const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached;

  let url;

  if (USE_PROXY) {
    // Usar proxy local para evitar CORS
    url = `${PROXY_URL}?endpoint=${encodeURIComponent(endpoint)}`;
  } else {
    // Usar API diretamente
    url = `${API_BASE_URL}${endpoint}`;
  }

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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    setCachedData(cacheKey, data);
    console.log(`✅ Resposta recebida`);
    return data;
  } catch (error) {
    console.error(`❌ Erro na requisição:`, error);
    throw error;
  }
}

// ===========================
// ADAPTADORES DE DADOS
// ===========================

function adaptAnimeData(anime) {
  return {
    id: anime.id,
    name: anime.name,
    title: anime.name,
    poster: anime.img,
    image: anime.img,
    rating: anime.rating || "N/A",
    episodes: anime.episodes || { sub: 0, dub: 0 },
    type: "anime",
  };
}

function adaptHomepageData(data) {
  return {
    status: 200,
    data: {
      spotlightAnimes: (data.spotlightAnimes || []).map(adaptAnimeData),
      trendingAnimes: (data.trendingAnimes || []).map(adaptAnimeData),
      mostPopularAnimes: (data.featuredAnimes?.mostPopularAnimes || []).map(
        adaptAnimeData
      ),
      mostFavoriteAnimes: (data.featuredAnimes?.mostFavoriteAnimes || []).map(
        adaptAnimeData
      ),
      top10Animes: {
        today: (data.top10Animes?.day || []).map(adaptAnimeData),
      },
      topAiringAnimes: (data.featuredAnimes?.topAiringAnimes || []).map(
        adaptAnimeData
      ),
      latestEpisodeAnimes: (data.latestEpisodes || []).map(adaptAnimeData),
      latestCompletedAnimes: (
        data.featuredAnimes?.latestCompletedAnimes || []
      ).map(adaptAnimeData),
      topUpcomingAnimes: (data.topUpcomingAnimes || []).map(adaptAnimeData),
    },
  };
}

// ===========================
// API METHODS
// ===========================

window.AnimeAPI = {
  // Homepage - ANIWATCH
  async loadContentForHomepage() {
    try {
      const data = await apiRequest("/aniwatch/");
      console.log("📦 Dados brutos da API:", data);
      const adapted = adaptHomepageData(data);
      console.log("✅ Dados adaptados:", adapted);
      return adapted;
    } catch (error) {
      console.error("Erro ao carregar homepage:", error);
      throw error;
    }
  },

  // Buscar animes - ANIWATCH
  async searchAnimes(query, page = 1) {
    try {
      const data = await apiRequest(
        `/aniwatch/search?keyword=${encodeURIComponent(query)}&page=${page}`
      );

      return {
        status: 200,
        data: {
          animes: (data.animes || []).map(adaptAnimeData),
          currentPage: data.currentPage || page,
          hasNextPage: data.hasNextPage || false,
          totalPages: data.totalPages || 1,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar animes:", error);
      throw error;
    }
  },

  // Info do anime - ANIWATCH
  async getAnimeInfo(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/aniwatch/anime/${cleanId}`);

      console.log("📦 Dados do anime:", data);

      return {
        status: 200,
        data: {
          anime: {
            info: {
              id: data.info.id,
              name: data.info.name,
              poster: data.info.img,
              description: data.info.description,
              rating: data.info.rating || "N/A",
              jname: data.moreInfo?.["Japanese:"] || data.info.name,
              stats: {
                episodes: data.info.episodes || { sub: 0, dub: 0 },
                type: data.info.category || "TV",
                status: data.moreInfo?.["Status:"] || "Unknown",
              },
            },
          },
        },
      };
    } catch (error) {
      console.error("Erro ao buscar info do anime:", error);
      throw error;
    }
  },

  // Episódios do anime - ANIWATCH
  async getAnimeEpisodes(animeId) {
    try {
      const cleanId = animeId.split("?")[0];
      const data = await apiRequest(`/aniwatch/episodes/${cleanId}`);

      console.log("📺 Estrutura de episódios:", data);

      return {
        status: 200,
        totalEpisodes: data.totalEpisodes,
        episodes: data.episodes.map((ep) => ({
          title: ep.name,
          episodeId: ep.episodeId,
          number: ep.episodeNo,
          isFiller: ep.filler || false,
        })),
      };
    } catch (error) {
      console.error("Erro ao buscar episódios:", error);
      throw error;
    }
  },

  // Servidores de um episódio - ANIWATCH
  async getEpisodeServers(episodeId) {
    try {
      console.log(`🎯 getEpisodeServers chamado com: "${episodeId}"`);

      const data = await apiRequest(
        `/aniwatch/servers?id=${encodeURIComponent(episodeId)}`
      );

      console.log("🎬 Servidores disponíveis:", data);

      return {
        status: 200,
        data: {
          sub: data.sub || [],
          dub: data.dub || [],
          episodeId: data.episodeId,
          episodeNo: data.episodeNo,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar servidores:", error);
      throw error;
    }
  },

  // Streams de um episódio - ANIWATCH
  async getEpisodeStreams(
    episodeId,
    server = "vidstreaming",
    category = "sub"
  ) {
    try {
      console.log(`🎯 getEpisodeStreams chamado com: "${episodeId}"`);
      console.log(`   - Servidor: ${server}, Categoria: ${category}`);

      const data = await apiRequest(
        `/aniwatch/episode-srcs?id=${encodeURIComponent(
          episodeId
        )}&server=${server}&category=${category}`
      );

      console.log("🎥 Stream data:", data);

      return {
        status: 200,
        data: {
          sources: data.sources || [],
          tracks: data.subtitles || [],
          headers: data.headers || {},
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar streams:", error);
      throw error;
    }
  },

  // Gêneros - ANIWATCH
  async getGenres() {
    try {
      const data = await apiRequest("/aniwatch/");
      return {
        status: 200,
        data: {
          genres: data.genres || [],
        },
      };
    } catch (error) {
      console.error("Erro ao buscar gêneros:", error);
      throw error;
    }
  },

  // Categoria (TV, Movie, OVA, etc) - ANIWATCH
  async getAnimeByCategory(category = "tv", page = 1) {
    try {
      const data = await apiRequest(`/aniwatch/${category}?page=${page}`);

      return {
        status: 200,
        data: {
          animes: (data.animes || []).map(adaptAnimeData),
          currentPage: data.currentPage || page,
          hasNextPage: data.hasNextPage || false,
          totalPages: data.totalPages || 1,
        },
      };
    } catch (error) {
      console.error("Erro ao buscar categoria:", error);
      throw error;
    }
  },
};

console.log("✅ API Service carregado (Falcon71181 API + Proxy)!");
console.log("📺 API Base:", API_BASE_URL);
console.log("🔄 Usando proxy:", USE_PROXY);
console.log("💾 Cache duration:", CACHE_DURATION / 1000 / 60, "minutos");
