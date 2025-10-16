// api-service.js - VERSÃO COM PROXY CORRIGIDO

class AnimeAPI {
  constructor() {
    this.baseURL = "https://hianime-api-bmy9.onrender.com/api/v1";

    // ✅ USAR PROXY LOCAL (deploy no Vercel junto com o site)
    this.proxyURL = "https://api.allorigins.win/raw?url=";

    // Se estiver testando localmente, use:
    // this.proxyURL = 'http://localhost:3000/api/proxy?url=';

    console.log("✅ HiAnime API inicializada!");
    console.log("🎬 API URL:", this.baseURL);
    console.log("🔗 Proxy URL:", this.proxyURL);
  }

  async request(endpoint) {
    const url = `${this.baseURL}${endpoint}`;
    console.log(`📡 GET ${url}`);

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Resposta:", data.success ? "OK" : "Falhou");
      return data;
    } catch (error) {
      console.error("❌ Erro:", error.message);
      throw error;
    }
  }

  async getHomePage() {
    return this.request("/home");
  }

  async search(query, page = 1) {
    return this.request(
      `/search?keyword=${encodeURIComponent(query)}&page=${page}`
    );
  }

  async getAnimesByCategory(category, page = 1) {
    const response = await this.request("/home");

    if (response.success && response.data) {
      const sectionMap = {
        "most-popular": "mostPopular",
        "top-airing": "topAiring",
        "latest-completed": "latestCompleted",
        "top-upcoming": "topUpcoming",
        tv: "trending",
        movie: "spotlights",
        ova: "latestEpisodes",
        ona: "latestEpisodes",
        special: "topUpcoming",
      };

      const section = sectionMap[category];
      const animes =
        section && response.data[section]
          ? response.data[section]
          : response.data.trending || [];

      return { success: true, data: animes };
    }

    return this.request("/home");
  }

  async getAnimesByGenre(genreName, page = 1) {
    return this.search(genreName, page);
  }

  async getAnimeDetails(animeId) {
    try {
      console.log(`📺 Buscando detalhes: ${animeId}`);

      const animeSlug = animeId.split("-").slice(0, -1).join(" ");
      const searchResponse = await this.search(animeSlug, 1);

      if (searchResponse.success && searchResponse.data) {
        const results = Array.isArray(searchResponse.data)
          ? searchResponse.data
          : searchResponse.data.response || [];

        const anime = results.find((a) => a.id === animeId) || results[0];

        if (anime) {
          return {
            success: true,
            data: {
              anime: {
                info: {
                  id: anime.id || animeId,
                  name: anime.title || anime.name || "Sem título",
                  poster: anime.poster || anime.image || "/placeholder.jpg",
                  description: "Clique em um episódio para assistir!",
                  stats: {
                    rating: anime.rating || "N/A",
                    quality: "HD",
                    episodes: {
                      sub: anime.episodes?.sub || 0,
                      dub: anime.episodes?.dub || 0,
                    },
                    type: anime.type || "TV",
                    duration: anime.duration || "N/A",
                  },
                },
              },
            },
          };
        }
      }

      return {
        success: true,
        data: {
          anime: {
            info: {
              id: animeId,
              name: animeId.replace(/-/g, " ").replace(/\d+$/, "").trim(),
              poster: "/placeholder.jpg",
              description: "Selecione um episódio abaixo para assistir!",
              stats: {
                rating: "N/A",
                quality: "HD",
                episodes: { sub: 0, dub: 0 },
                type: "TV",
                duration: "N/A",
              },
            },
          },
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar detalhes:", error);
      return {
        success: true,
        data: {
          anime: {
            info: {
              id: animeId,
              name: animeId.replace(/-/g, " ").replace(/\d+$/, "").trim(),
              poster: "/placeholder.jpg",
              description: "Carregue os episódios abaixo",
              stats: {
                rating: "N/A",
                quality: "HD",
                episodes: { sub: 0, dub: 0 },
                type: "TV",
                duration: "N/A",
              },
            },
          },
        },
      };
    }
  }

  async getAnimeInfo(animeId) {
    return this.getAnimeDetails(animeId);
  }

  async getEpisodes(animeId) {
    try {
      console.log(`📺 Buscando episódios: ${animeId}`);
      const response = await this.request(`/episodes/${animeId}`);

      if (!response.success || !response.data) {
        throw new Error("Episódios não encontrados");
      }

      const episodes = response.data.map((ep, index) => ({
        episodeId: ep.id,
        id: ep.id,
        number: ep.episodeNumber || index + 1,
        episodeNumber: ep.episodeNumber || index + 1,
        title: ep.title || `Episódio ${index + 1}`,
        isFiller: ep.isFiller || false,
      }));

      return {
        success: true,
        data: {
          totalEpisodes: episodes.length,
          episodes: episodes,
        },
      };
    } catch (error) {
      console.error("❌ Erro ao buscar episódios:", error);
      throw error;
    }
  }

  async getEpisodeServers(episodeId) {
    console.log(`🌐 Buscando servidores: ${episodeId}`);
    return this.request(`/servers?id=${episodeId}`);
  }

  // ==========================================
  // STREAMING COM PROXY LOCAL ✨
  // ==========================================
  async getStreamingLinks(episodeId, server = "hd-1", type = "sub") {
    try {
      console.log(`🎬 Streaming: ${episodeId} | ${server} | ${type}`);

      const response = await this.request(
        `/stream?id=${episodeId}&server=${server}&type=${type}`
      );

      if (!response.success || !response.data || !response.data.link) {
        throw new Error("Link não disponível");
      }

      const originalM3U8 = response.data.link.file;

      // ✅ USAR PROXY LOCAL
      const proxiedM3U8 = `${this.proxyURL}${encodeURIComponent(originalM3U8)}`;

      console.log("🎥 M3U8 original:", originalM3U8);
      console.log("🔗 M3U8 proxiado:", proxiedM3U8);

      // Proxiar legendas também
      const tracks = (response.data.tracks || [])
        .filter((track) => track.kind === "captions")
        .map((track) => ({
          file: `${this.proxyURL}${encodeURIComponent(track.file)}`,
          label: track.label || "English",
          kind: "subtitles",
          default: track.default || false,
        }));

      return {
        success: true,
        data: {
          sources: [
            {
              url: proxiedM3U8,
              type: "hls",
              quality: "auto",
            },
          ],
          tracks: tracks,
          intro: response.data.intro,
          outro: response.data.outro,
          server: server,
        },
      };
    } catch (error) {
      console.error("❌ Erro streaming:", error.message);
      throw error;
    }
  }

  formatEpisodeId(episodeId) {
    return episodeId;
  }
}

window.AnimeAPI = new AnimeAPI();
console.log("🚀 AnimeAPI pronta com Proxy Local!");
