// api-service.js - JIKAN + HIANIME API (COM STREAMING DIRETO)
const JIKAN_URL = "https://api.jikan.moe/v4";
const HIANIME_API_URL = "https://hiaapi-production.up.railway.app"; // Deploy sua própria instância!

async function apiRequest(url, options = {}, retries = 3) {
  console.log(`📡 GET ${url}`);

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        method: "GET",
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        if (response.status === 429) {
          console.warn(`⚠️ Rate limit - aguardando...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Sucesso`);
      return data;
    } catch (error) {
      console.error(`❌ Tentativa ${i + 1}/${retries} falhou:`, error.message);

      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

function createAnimeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

window.AnimeAPI = {
  // ============ JIKAN (INFO) ============
  search: async (query, page = 1) => {
    const url = `${JIKAN_URL}/anime?q=${encodeURIComponent(
      query
    )}&page=${page}&limit=20&sfw=true`;
    const data = await apiRequest(url);
    return {
      status: 200,
      data: {
        results: data.data.map((anime) => ({
          id: anime.mal_id,
          title: anime.title,
          titleEnglish: anime.title_english || anime.title,
          slug: createAnimeSlug(anime.title_english || anime.title),
          image: anime.images.jpg.large_image_url,
          rating: anime.score,
          releaseDate: anime.aired?.from
            ? new Date(anime.aired.from).getFullYear()
            : "N/A",
          description: anime.synopsis,
          totalEpisodes: anime.episodes || 12,
          type: "anime",
        })),
      },
    };
  },

  getTopAiring: async (page = 1) => {
    const url = `${JIKAN_URL}/top/anime?filter=airing&page=${page}&limit=20`;
    const data = await apiRequest(url);
    return {
      status: 200,
      data: {
        results: data.data.map((anime) => ({
          id: anime.mal_id,
          title: anime.title,
          titleEnglish: anime.title_english || anime.title,
          slug: createAnimeSlug(anime.title_english || anime.title),
          image: anime.images.jpg.large_image_url,
          rating: anime.score,
          releaseDate: anime.aired?.from
            ? new Date(anime.aired.from).getFullYear()
            : "N/A",
          description: anime.synopsis,
          totalEpisodes: anime.episodes || 12,
          type: "anime",
        })),
      },
    };
  },

  getCurrentSeason: async (page = 1) => {
    const url = `${JIKAN_URL}/seasons/now?page=${page}&limit=20&sfw=true`;
    const data = await apiRequest(url);
    return {
      status: 200,
      data: {
        results: data.data.map((anime) => ({
          id: anime.mal_id,
          title: anime.title,
          titleEnglish: anime.title_english || anime.title,
          slug: createAnimeSlug(anime.title_english || anime.title),
          image: anime.images.jpg.large_image_url,
          rating: anime.score,
          releaseDate: anime.aired?.from
            ? new Date(anime.aired.from).getFullYear()
            : "N/A",
          description: anime.synopsis,
          totalEpisodes: anime.episodes || 12,
          type: "anime",
        })),
      },
    };
  },

  getInfo: async (malId) => {
    const url = `${JIKAN_URL}/anime/${malId}/full`;
    const data = await apiRequest(url);
    const anime = data.data;

    return {
      status: 200,
      data: {
        id: anime.mal_id,
        title: anime.title,
        titleEnglish: anime.title_english || anime.title,
        slug: createAnimeSlug(anime.title_english || anime.title),
        image: anime.images.jpg.large_image_url,
        cover: anime.images.jpg.image_url,
        description: anime.synopsis,
        rating: anime.score,
        releaseDate: anime.aired?.from
          ? new Date(anime.aired.from).getFullYear()
          : "N/A",
        genres: anime.genres?.map((g) => g.name) || [],
        totalEpisodes: anime.episodes || 12,
        status: anime.status,
        type: "anime",
      },
    };
  },

  // ============ HIANIME (BUSCA POR SLUG) ============
  searchHiAnime: async (query) => {
    const url = `${HIANIME_API_URL}/search?keyword=${encodeURIComponent(
      query
    )}&page=1`;
    const data = await apiRequest(url);

    if (data.success && data.data.response.length > 0) {
      return data.data.response[0].id; // Retorna o ID do primeiro resultado
    }
    return null;
  },

  // ============ HIANIME (EPISÓDIOS) ============
  getEpisodes: async (animeId) => {
    const url = `${HIANIME_API_URL}/episodes/${animeId}`;
    const data = await apiRequest(url);
    return data;
  },

  // ============ HIANIME (STREAMING LINK) ============
  getStreamingLink: async (animeId, episodeNumber) => {
    try {
      // 1. Busca episódios
      const episodesData = await window.AnimeAPI.getEpisodes(animeId);

      if (!episodesData.success || !episodesData.data[episodeNumber - 1]) {
        throw new Error("Episódio não encontrado");
      }

      const episodeId = episodesData.data[episodeNumber - 1].id.replace(
        "/watch/",
        ""
      );

      // 2. Busca servidores
      const serversUrl = `${HIANIME_API_URL}/servers?id=${episodeId}`;
      const serversData = await apiRequest(serversUrl);

      if (!serversData.success || !serversData.data.sub[0]) {
        throw new Error("Servidor não encontrado");
      }

      // 3. Busca link de streaming
      const serverId = serversData.data.sub[0].id;
      const streamUrl = `${HIANIME_API_URL}/stream?server=HD-2&type=sub&id=${episodeId}`;
      const streamData = await apiRequest(streamUrl);

      if (!streamData.success) {
        throw new Error("Link de streaming não encontrado");
      }

      return {
        success: true,
        data: {
          streamingLink: streamData.data.streamingLink.link.file,
          type: streamData.data.streamingLink.link.type,
          intro: streamData.data.streamingLink.intro,
          outro: streamData.data.streamingLink.outro,
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar streaming:", error);
      return { success: false, error: error.message };
    }
  },
};

console.log("✅ API carregada (HiAnime + Jikan)!");
console.log("🔗 Jikan:", JIKAN_URL);
console.log("🎬 HiAnime API:", HIANIME_API_URL);
