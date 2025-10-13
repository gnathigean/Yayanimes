// api-service.js
// Serviço de API para HiAnime com sistema de fila e proteção contra rate limit

(function() {
  'use strict';

  // Configuração da API
  const API_CONFIG = {
    baseURL: 'https://yayapi-delta.vercel.app/api/v2/hianime',
    timeout: 30000,
    cache: {
      duration: 60 * 60 * 1000, // 1 hora (aumentado)
      enabled: true
    },
    requestDelay: 1000, // 1 segundo entre requisições
    maxRetries: 3
  };

  // ✅ SISTEMA DE FILA DE REQUISIÇÕES
  class RequestQueue {
    constructor(delayMs = 1000) {
      this.queue = [];
      this.processing = false;
      this.delay = delayMs;
      this.lastRequestTime = 0;
    }

    async add(fn) {
      return new Promise((resolve, reject) => {
        this.queue.push({ fn, resolve, reject });
        this.process();
      });
    }

    async process() {
      if (this.processing || this.queue.length === 0) return;

      this.processing = true;
      const { fn, resolve, reject } = this.queue.shift();

      try {
        // Garantir delay mínimo entre requisições
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.delay) {
          await new Promise(r => setTimeout(r, this.delay - timeSinceLastRequest));
        }

        const result = await fn();
        this.lastRequestTime = Date.now();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Aguardar antes de processar próxima requisição
      await new Promise(r => setTimeout(r, this.delay));
      this.processing = false;
      this.process();
    }
  }

  const requestQueue = new RequestQueue(API_CONFIG.requestDelay);

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
    
    console.log('📦 Retornando do cache:', key);
    return cached.data;
  }

  function setCache(key, data) {
    if (!API_CONFIG.cache.enabled) return;
    
    cache.set(key, {
      data: data,
      timestamp: Date.now()
    });
  }

  // ✅ FUNÇÃO DE REQUISIÇÃO MELHORADA
  async function fetchAPI(endpoint, params = {}, retryCount = 0) {
    const cacheKey = getCacheKey(endpoint, params);
    
    // Verificar cache PRIMEIRO
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Construir URL
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = queryString 
      ? `${API_CONFIG.baseURL}${endpoint}?${queryString}`
      : `${API_CONFIG.baseURL}${endpoint}`;

    // ✅ ADICIONAR À FILA DE REQUISIÇÕES
    return requestQueue.add(async () => {
      console.log('🌐 Fazendo requisição:', url);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'YayaAnimes/1.0'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // ✅ TRATAR RATE LIMIT (429)
        if (response.status === 429) {
          if (retryCount < API_CONFIG.maxRetries) {
            const retryDelay = Math.min(2000 * Math.pow(2, retryCount), 10000);
            console.warn(`⚠️ Rate limit (429) - Aguardando ${retryDelay}ms (tentativa ${retryCount + 1}/${API_CONFIG.maxRetries})`);
            
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return fetchAPI(endpoint, params, retryCount + 1);
          }
          throw new Error('Rate limit excedido. Por favor, aguarde alguns minutos.');
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Verificar sucesso da resposta
        if (data.success === false) {
          throw new Error(data.message || 'Erro na resposta da API');
        }

        // Armazenar no cache
        setCache(cacheKey, data);
        console.log('✅ Requisição bem-sucedida:', endpoint);

        return data;

      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error('Timeout: A requisição demorou muito');
        }
        console.error('❌ Erro na requisição:', error);
        throw error;
      }
    });
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

    // 4. Anime About Info
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

    // 11. Anime Episodes
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

    // 13. Episode Servers
    async getEpisodeServers(episodeId) {
      console.log(`📡 getEpisodeServers(${episodeId})`);
      
      if (!episodeId || typeof episodeId !== 'string') {
        throw new Error('episodeId inválido');
      }

      return await fetchAPI('/episode/servers', { animeEpisodeId: episodeId });
    },

    // 14. Episode Streaming Sources
    async getEpisodeSources(episodeId, server = 'vidstreaming', category = 'sub') {
      console.log(`📡 getEpisodeSources(${episodeId}, ${server}, ${category})`);
      
      if (!episodeId || typeof episodeId !== 'string') {
        throw new Error('episodeId inválido');
      }

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
    },

    getQueueSize() {
      return requestQueue.queue.length;
    }
  };

  // ==================== EXPORTAR PARA WINDOW ====================
  
  window.api = APIService;
  window.APIService = APIService;

  console.log('✅ API Service carregado!');
  console.log('📺 API Base:', API_CONFIG.baseURL);
  console.log('💾 Cache duration:', API_CONFIG.cache.duration / 60000, 'minutos');
  console.log('⏱️ Request delay:', API_CONFIG.requestDelay, 'ms');
  console.log('🔍 window.api:', window.api);

})();