// api-service.js
// Serviço de API para HiAnime

(function() {
  'use strict';

  // Configuração da API
  const API_CONFIG = {
    baseURL: 'https://yayapi-delta.vercel.app/api/v2/hianime',
    timeout: 30000,
    cache: {
      duration: 30 * 60 * 1000, // 30 minutos
      enabled: true
    }
  };

  // Cache simples em memória
  const cache = new Map();

  // Função auxiliar para cache
  function getCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  function getFromCache(key) {
    if (!API_CONFIG.cache.enabled) return null;
    
    const cached = cache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > API_CONFIG.cache.duration) {
      cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  function setCache(key, data) {
    if (!API_CONFIG.cache.enabled) return;
    
    cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // Função auxiliar para fazer requisições
  async function fetchAPI(endpoint, params = {}) {
    const cacheKey = getCacheKey(endpoint, params);
    
    // Verificar cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log('📦 Retornando do cache:', endpoint);
      return cached;
    }

    // Construir URL
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = queryString 
      ? `${API_CONFIG.baseURL}${endpoint}?${queryString}`
      : `${API_CONFIG.baseURL}${endpoint}`;

    console.log('🌐 Fazendo requisição:', url);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Verificar se a resposta tem sucesso
      if (data.success === false) {
        throw new Error(data.message || 'Erro na resposta da API');
      }

      // Armazenar no cache
      setCache(cacheKey, data);

      return data;

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Timeout: A requisição demorou muito');
      }
      console.error('❌ Erro na requisição:', error);
      throw error;
    }
  }

  // ==================== API PÚBLICA ====================

  const APIService = {
    
    // 1. Home Page
    async getHome() {
      console.log('📡 getHome()');
      return await fetchAPI('/home');
    },

    // 2. Anime A-Z List
    async getAZList(sortOption = 'a', page = 1) {
      console.log(`📡 getAZList(${sortOption}, ${page})`);
      return await fetchAPI(`/azlist/${sortOption}`, { page });
    },

    // 3. Anime Qtip Info
    async getAnimeQtip(animeId) {
      console.log(`📡 getAnimeQtip(${animeId})`);
      return await fetchAPI(`/qtip/${animeId}`);
    },

    // 4. Anime About Info (PRINCIPAL)
    async getAnimeInfo(animeId) {
      console.log(`📡 getAnimeInfo(${animeId})`);
      if (!animeId || typeof animeId !== 'string') {
        throw new Error('animeId inválido');
      }
      return await fetchAPI(`/anime/${animeId}`);
    },

    // 5. Search Results
    async search(query, options = {}) {
      console.log(`📡 search(${query})`, options);
      if (!query) {
        throw new Error('Query de busca é obrigatória');
      }
      
      const params = {
        q: query,
        page: options.page || 1,
        ...options
      };
      
      return await fetchAPI('/search', params);
    },

    // 6. Search Suggestions
    async getSearchSuggestions(query) {
      console.log(`📡 getSearchSuggestions(${query})`);
      if (!query) return { suggestions: [] };
      return await fetchAPI('/search/suggestion', { q: query });
    },

    // 7. Producer Animes
    async getProducerAnimes(name, page = 1) {
      console.log(`📡 getProducerAnimes(${name}, ${page})`);
      return await fetchAPI(`/producer/${name}`, { page });
    },

    // 8. Genre Animes
    async getGenreAnimes(name, page = 1) {
      console.log(`📡 getGenreAnimes(${name}, ${page})`);
      return await fetchAPI(`/genre/${name}`, { page });
    },

    // 9. Category Animes
    async getCategoryAnimes(name, page = 1) {
      console.log(`📡 getCategoryAnimes(${name}, ${page})`);
      return await fetchAPI(`/category/${name}`, { page });
    },

    // 10. Estimated Schedules
    async getSchedule(date) {
      console.log(`📡 getSchedule(${date})`);
      const params = date ? { date } : {};
      return await fetchAPI('/schedule', params);
    },

    // 11. Anime Episodes (PRINCIPAL)
    async getAnimeEpisodes(animeId) {
      console.log(`📡 getAnimeEpisodes(${animeId})`);
      if (!animeId || typeof animeId !== 'string') {
        throw new Error('animeId inválido');
      }
      return await fetchAPI(`/anime/${animeId}/episodes`);
    },

    // 12. Next Episode Schedule
    async getNextEpisodeSchedule(animeId) {
      console.log(`📡 getNextEpisodeSchedule(${animeId})`);
      return await fetchAPI(`/anime/${animeId}/next-episode-schedule`);
    },

    // 13. Episode Servers (PRINCIPAL)
    async getEpisodeServers(episodeId) {
      console.log(`📡 getEpisodeServers(${episodeId})`);
      console.log(`📌 Tipo do episodeId: ${typeof episodeId}`);
      console.log(`📌 Valor completo: "${episodeId}"`);
      
      if (!episodeId || typeof episodeId !== 'string') {
        throw new Error('episodeId inválido');
      }

      // ✅ USAR O EPISODEID COMPLETO SEM MODIFICAÇÕES
      return await fetchAPI('/episode/servers', { animeEpisodeId: episodeId });
    },

    // 14. Episode Streaming Sources (PRINCIPAL)
    async getEpisodeSources(episodeId, server = 'vidstreaming', category = 'sub') {
      console.log(`📡 getEpisodeSources(${episodeId}, ${server}, ${category})`);
      
      if (!episodeId || typeof episodeId !== 'string') {
        throw new Error('episodeId inválido');
      }

      // ✅ USAR O EPISODEID COMPLETO SEM MODIFICAÇÕES
      return await fetchAPI('/episode/sources', {
        animeEpisodeId: episodeId,
        server: server,
        category: category
      });
    },

    // Utilitários
    clearCache() {
      cache.clear();
      console.log('🗑️ Cache limpo');
    },

    getCacheSize() {
      return cache.size;
    }
  };

  // ==================== EXPORTAR PARA WINDOW ====================
  
  // ✅ EXPORTAÇÃO CRÍTICA - Garantir que api está no escopo global
  window.api = APIService;
  window.APIService = APIService; // Alias alternativo

  console.log('✅ API Service carregado!');
  console.log('📺 API Base:', API_CONFIG.baseURL);
  console.log('💾 Cache duration:', API_CONFIG.cache.duration / 60000, 'minutos');
  console.log('🔍 window.api:', window.api);
  console.log('🔍 typeof window.api:', typeof window.api);

})();