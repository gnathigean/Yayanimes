// content-streaming.js
// Lógica principal da página de streaming

// ==================== VERIFICAÇÃO IMEDIATA DA API ====================
console.log('🔍 Verificando API no início do script...');
console.log('🔍 window.api existe?', typeof window.api !== 'undefined');
console.log('🔍 window.api:', window.api);

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let currentSubscription = null;
let favoriteAnimes = new Set();
let watchHistory = [];
let currentFilter = 'all';

// ==================== UTILITÁRIOS ====================

function showLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  }
  console.log('✅ Loading exibido');
}

function hideLoading() {
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
  console.log('✅ Loading ocultado');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  
  if (type === 'error') {
    toast.style.background = 'rgba(239, 68, 68, 0.9)';
  } else if (type === 'success') {
    toast.style.background = 'rgba(16, 185, 129, 0.9)';
  }

  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showErrorMessage(message) {
  console.log('❌ Erro ao inicializar aplicação');
  
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      text-align: center;
      padding: 40px;
    ">
      <div style="font-size: 64px; margin-bottom: 20px;">😔</div>
      <h2 style="color: #ef4444; margin-bottom: 15px;">Erro ao Carregar</h2>
      <p style="color: #9ca3af; margin-bottom: 25px; max-width: 500px;">
        ${message}
      </p>
      <button 
        class="btn-primary" 
        onclick="location.reload()"
        style="padding: 12px 30px; font-size: 16px;">
        🔄 Tentar Novamente
      </button>
    </div>
  `;
}

// ==================== AUTENTICAÇÃO ====================

async function checkAuth() {
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      return null;
    }

    if (!user) {
      console.log('⚠️ Usuário não autenticado');
      return null;
    }

    console.log('✅ Usuário autenticado:', user.email);
    return user;

  } catch (error) {
    console.error('❌ Erro ao verificar auth:', error);
    return null;
  }
}

async function checkSubscription(userId) {
  try {
    const { data, error } = await window.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error) {
      console.error('❌ Erro ao verificar assinatura:', error);
      return null;
    }

    console.log('✅ Assinatura encontrada:', data);
    return data;

  } catch (error) {
    console.error('❌ Erro ao verificar subscription:', error);
    return null;
  }
}

async function logout() {
  try {
    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;
    window.location.href = 'index.html';
  } catch (error) {
    console.error('❌ Erro ao fazer logout:', error);
    showToast('Erro ao fazer logout', 'error');
  }
}

// ==================== FAVORITOS ====================

async function loadFavorites() {
  if (!currentUser) return;

  try {
    const { data, error } = await window.supabase
      .from('favorites')
      .select('anime_id')
      .eq('user_id', currentUser.id);

    // ✅ Tratar erro de tabela não existente
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('⚠️ Tabela favorites não existe ainda');
        favoriteAnimes = new Set();
        return;
      }
      throw error;
    }

    favoriteAnimes = new Set(data.map(f => f.anime_id));
    console.log('✅ Favoritos carregados:', favoriteAnimes.size);

  } catch (error) {
    console.error('❌ Erro ao carregar favoritos:', error);
    favoriteAnimes = new Set(); // Inicializar vazio em caso de erro
  }
}

async function toggleFavorite(animeId) {
  if (!currentUser) {
    showToast('Faça login para adicionar favoritos', 'error');
    return;
  }

  try {
    if (favoriteAnimes.has(animeId)) {
      // Remover
      const { error } = await window.supabase
        .from('favorites')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('anime_id', animeId);

      if (error) throw error;

      favoriteAnimes.delete(animeId);
      showToast('Removido dos favoritos', 'info');

    } else {
      // Adicionar
      const { error } = await window.supabase
        .from('favorites')
        .insert({
          user_id: currentUser.id,
          anime_id: animeId
        });

      if (error) throw error;

      favoriteAnimes.add(animeId);
      showToast('Adicionado aos favoritos ❤️', 'success');
    }

    // Atualizar UI
    updateFavoriteButtons();

  } catch (error) {
    console.error('❌ Erro ao toggle favorito:', error);
    showToast('Erro ao atualizar favorito', 'error');
  }
}

function updateFavoriteButtons() {
  document.querySelectorAll('.card-favorite').forEach(btn => {
    const animeId = btn.dataset.animeId;
    if (favoriteAnimes.has(animeId)) {
      btn.classList.add('active');
      btn.textContent = '❤️';
    } else {
      btn.classList.remove('active');
      btn.textContent = '🤍';
    }
  });
}

// ==================== HISTÓRICO ====================

async function loadWatchHistory() {
  if (!currentUser) return;

  try {
    const { data, error } = await window.supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('last_watched', { ascending: false })
      .limit(10);

    // ✅ Tratar erro de tabela não existente
    if (error) {
      if (error.code === 'PGRST205') {
        console.warn('⚠️ Tabela watch_history não existe ainda');
        watchHistory = [];
        return;
      }
      throw error;
    }

    watchHistory = data || [];
    console.log('✅ Histórico carregado:', watchHistory.length);

  } catch (error) {
    console.error('❌ Erro ao carregar histórico:', error);
    watchHistory = []; // Inicializar vazio em caso de erro
  }
}

async function saveWatchHistory(animeId, episodeNumber, progress = 0) {
  if (!currentUser) return;

  try {
    const { error } = await window.supabase
      .from('watch_history')
      .upsert({
        user_id: currentUser.id,
        anime_id: animeId,
        episode_number: episodeNumber,
        progress: progress,
        last_watched: new Date().toISOString()
      }, {
        onConflict: 'user_id,anime_id'
      });

    if (error) throw error;

    console.log('✅ Histórico salvo');

  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}

// ==================== RENDERIZAÇÃO ====================

function createAnimeCard(anime) {
  // Garantir que temos um ID válido
  const animeId = anime.id || anime.animeId || '';
  const isFavorite = favoriteAnimes.has(animeId);
  
  // Extrair dados com fallbacks
  const animeName = anime.name || anime.title || 'Sem título';
  const animePoster = anime.poster || anime.image || 'https://via.placeholder.com/300x450/667eea/ffffff?text=No+Image';
  const animeType = anime.type || '';
  const animeDuration = anime.duration || '';
  const animeRating = anime.rating || '';
  
  // Informações de episódios
  const subEpisodes = anime.episodes?.sub || anime.subCount || '';
  const dubEpisodes = anime.episodes?.dub || anime.dubCount || '';
  
  return `
    <div class="content-card" data-anime-id="${animeId}">
      <div class="card-image">
        <img src="${animePoster}" 
             alt="${animeName}"
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x450/667eea/ffffff?text=Error'">
        
        <div class="card-overlay">
          <div class="overlay-details">
            <h4 class="card-title" title="${animeName}">${animeName}</h4>
            <div class="card-meta">
              ${animeType ? `<span>📺 ${animeType}</span>` : ''}
              ${animeDuration ? `<span>⏱️ ${animeDuration}</span>` : ''}
              ${animeRating ? `<span>⭐ ${animeRating}</span>` : ''}
            </div>
          </div>
          
          <div class="card-actions">
            <button class="btn-play" onclick="watchAnime('${animeId}', 1)">
              ▶️ Assistir
            </button>
            <button class="btn-info" onclick="showAnimeInfo('${animeId}')">
              ℹ️ Info
            </button>
          </div>
        </div>

        ${subEpisodes ? `<div class="card-badge">SUB ${subEpisodes}</div>` : ''}
        ${dubEpisodes ? `<div class="card-badge" style="top: 45px; background: rgba(239, 68, 68, 0.9);">DUB ${dubEpisodes}</div>` : ''}
      </div>

      <div class="card-info">
        <h4 class="card-title" title="${animeName}">${animeName}</h4>
        <div class="card-meta">
          ${animeType ? `<span>${animeType}</span>` : ''}
          ${animeRating ? `<span>⭐ ${animeRating}</span>` : ''}
        </div>
      </div>

      <button class="card-favorite ${isFavorite ? 'active' : ''}" 
              data-anime-id="${animeId}"
              onclick="toggleFavorite('${animeId}')">
        ${isFavorite ? '❤️' : '🤍'}
      </button>
    </div>
  `;
}

function renderAnimeSection(sectionId, title, animes, showSeeAll = false) {
  const section = document.createElement('section');
  section.className = 'content-section';
  section.id = sectionId;

  section.innerHTML = `
    <div class="section-header">
      <h3>${title}</h3>
      ${showSeeAll ? '<button class="btn-see-all">Ver Todos →</button>' : ''}
    </div>
    <div class="content-grid">
      ${animes.map(anime => createAnimeCard(anime)).join('')}
    </div>
  `;

  return section;
}

// ==================== CARREGAMENTO DE CONTEÚDO ====================

async function loadHomeContent() {
  console.log('📺 Carregando conteúdo home...');

  try {
    showLoading();

    // ✅ Verificar se API existe ANTES de usar
    if (typeof window.api === 'undefined' || !window.api) {
      throw new Error('API Service não está disponível');
    }

    const homeData = await window.api.getHome();
    console.log('✅ Dados home carregados:', homeData);
    console.log('📊 Estrutura dos dados:', JSON.stringify(homeData.data, null, 2).substring(0, 500));

    // ✅ API retorna { status: 200, data: {...} }
    if (!homeData || !homeData.data) {
      throw new Error('Dados da home inválidos');
    }

    const container = document.getElementById('dynamic-content-container');
    container.innerHTML = '';

    const data = homeData.data;
    
    console.log('📊 Chaves disponíveis:', Object.keys(data));

    // ✅ A API retorna objetos diretos, não um array de sections
    const contentSections = [
      { id: 'spotlight', title: '🌟 Em Destaque', animes: data.spotlightAnimes || [] },
      { id: 'trending', title: '🔥 Populares', animes: data.trendingAnimes || [] },
      { id: 'latest-episodes', title: '🆕 Últimos Episódios', animes: data.latestEpisodeAnimes || [] },
      { id: 'top-upcoming', title: '📅 Próximos Lançamentos', animes: data.topUpcomingAnimes || [] },
      { id: 'top-airing', title: '📺 Em Exibição', animes: data.topAiringAnimes || [] },
      { id: 'most-popular', title: '⭐ Mais Populares', animes: data.mostPopularAnimes || [] },
      { id: 'most-favorite', title: '❤️ Mais Favoritos', animes: data.mostFavoriteAnimes || [] },
      { id: 'latest-completed', title: '✅ Recém Finalizados', animes: data.latestCompletedAnimes || [] },
      { id: 'top-10', title: '🏆 Top 10', animes: data.top10Animes?.today || [] }
    ];
    
    console.log('📦 Seções encontradas:', contentSections.length);
    
    let totalAnimes = 0;
    
    contentSections.forEach((section, index) => {
      const animes = section.animes;
      
      if (animes && animes.length > 0) {
        console.log(`📋 Seção ${index + 1}: ${section.title} - ${animes.length} animes`);
        totalAnimes += animes.length;
        
        const sectionElement = renderAnimeSection(
          section.id,
          section.title,
          animes,
          true
        );
        container.appendChild(sectionElement);
      }
    });
    
    console.log('✅ Total de animes renderizados:', totalAnimes);
    
    if (totalAnimes === 0) {
      console.warn('⚠️ Nenhum anime encontrado para renderizar');
      container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: white;">
          <h3 style="font-size: 24px; margin-bottom: 15px;">📺 Nenhum conteúdo disponível</h3>
          <p style="color: #9ca3af;">Os animes serão carregados em breve.</p>
        </div>
      `;
    }

    // Renderizar histórico se existir
    if (watchHistory.length > 0) {
      await renderContinueWatching();
    }

    hideLoading();
    console.log('✅ Conteúdo home renderizado');

  } catch (error) {
    console.error('❌ Erro ao carregar home:', error);
    hideLoading();
    showErrorMessage('Erro ao carregar conteúdo: ' + error.message);
  }
}

async function renderContinueWatching() {
  if (watchHistory.length === 0) return;

  console.log('📺 Renderizando continue assistindo...');

  const section = document.getElementById('continue-watching-section');
  const grid = document.getElementById('continue-grid');

  if (!section || !grid) return;

  // Buscar informações dos animes do histórico
  const animePromises = watchHistory.slice(0, 6).map(async (history) => {
    try {
      const animeInfo = await window.api.getAnimeInfo(history.anime_id);
      return {
        ...animeInfo.data.anime.info,
        id: history.anime_id,
        lastEpisode: history.episode_number,
        progress: history.progress
      };
    } catch (error) {
      console.error('❌ Erro ao buscar anime:', history.anime_id);
      return null;
    }
  });

  const animes = (await Promise.all(animePromises)).filter(a => a !== null);

  if (animes.length > 0) {
    grid.innerHTML = animes.map(anime => createAnimeCard(anime)).join('');
    section.style.display = 'block';
  }
}

// ==================== BUSCA ====================

let searchTimeout = null;

async function performSearch(query) {
  if (!query || query.length < 2) {
    loadHomeContent();
    return;
  }

  console.log('🔍 Buscando:', query);

  try {
    showLoading();

    const results = await window.api.search(query);
    console.log('✅ Resultados da busca:', results);

    const container = document.getElementById('dynamic-content-container');
    container.innerHTML = '';

    if (results.data?.animes && results.data.animes.length > 0) {
      const section = renderAnimeSection(
        'search-results',
        `Resultados para "${query}"`,
        results.data.animes,
        false
      );
      container.appendChild(section);
    } else {
      container.innerHTML = `
        <div class="no-results">
          <h3>😔 Nenhum resultado encontrado</h3>
          <p>Tente buscar por outro termo</p>
        </div>
      `;
    }

    hideLoading();

  } catch (error) {
    console.error('❌ Erro na busca:', error);
    hideLoading();
    showToast('Erro ao buscar animes', 'error');
  }
}

// ==================== AÇÕES DE ANIME ====================

function watchAnime(animeId, episode = 1) {
  console.log('▶️ Assistir anime:', animeId, 'episódio:', episode);
  
  // Salvar no histórico
  saveWatchHistory(animeId, episode);
  
  // Redirecionar para player
  window.location.href = `player.html?id=${animeId}&ep=${episode}`;
}

async function showAnimeInfo(animeId) {
  console.log('ℹ️ Mostrando info do anime:', animeId);
  
  try {
    showLoading();

    const animeInfo = await window.api.getAnimeInfo(animeId);
    console.log('✅ Info do anime:', animeInfo);

    if (!animeInfo || !animeInfo.success) {
      throw new Error('Informações do anime não encontradas');
    }

    const anime = animeInfo.data.anime;
    const info = anime.info;
    const moreInfo = anime.moreInfo;

    // Criar modal
    const modal = document.createElement('div');
    modal.className = 'info-modal-overlay';
    modal.innerHTML = `
      <div class="info-modal">
        <button class="btn-close" onclick="this.closest('.info-modal-overlay').remove()">✕</button>
        <div class="info-content">
          <img src="${info.poster}" alt="${info.name}">
          <div class="info-details">
            <h2>${info.name}</h2>
            <div class="info-meta">
              <span>⭐ ${info.stats.rating}</span>
              <span>📺 ${info.stats.type}</span>
              <span>⏱️ ${info.stats.duration}</span>
              <span>${moreInfo.status}</span>
            </div>
            <p>${info.description || 'Sem descrição disponível'}</p>
            <div class="info-actions">
              <button class="btn-primary" onclick="watchAnime('${animeId}', 1)">
                ▶️ Assistir Agora
              </button>
              <button class="btn-secondary" onclick="toggleFavorite('${animeId}')">
                ${favoriteAnimes.has(animeId) ? '❤️ Remover' : '🤍 Favoritar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    hideLoading();

  } catch (error) {
    console.error('❌ Erro ao mostrar info:', error);
    hideLoading();
    showToast('Erro ao carregar informações', 'error');
  }
}

// ==================== FILTROS ====================

function setupFilters() {
  const navButtons = document.querySelectorAll('.nav-btn');
  
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Atualizar botão ativo
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Aplicar filtro
      const filter = btn.dataset.filter;
      currentFilter = filter;

      console.log('🔍 Filtro aplicado:', filter);

      if (filter === 'all') {
        loadHomeContent();
      } else if (filter === 'favorites') {
        showFavorites();
      } else if (filter === 'trending') {
        loadTrending();
      }
    });
  });
}

async function showFavorites() {
  if (favoriteAnimes.size === 0) {
    const container = document.getElementById('dynamic-content-container');
    container.innerHTML = `
      <div class="no-results">
        <h3>💔 Nenhum favorito ainda</h3>
        <p>Adicione seus animes favoritos clicando no ❤️</p>
      </div>
    `;
    return;
  }

  console.log('❤️ Carregando favoritos...');
  showLoading();

  try {
    const favoritePromises = Array.from(favoriteAnimes).map(async (animeId) => {
      try {
        const animeInfo = await window.api.getAnimeInfo(animeId);
        return { ...animeInfo.data.anime.info, id: animeId };
      } catch {
        return null;
      }
    });

    const animes = (await Promise.all(favoritePromises)).filter(a => a !== null);

    const container = document.getElementById('dynamic-content-container');
    container.innerHTML = '';

    const section = renderAnimeSection(
      'favorites-section',
      '❤️ Meus Favoritos',
      animes,
      false
    );

    container.appendChild(section);
    hideLoading();

  } catch (error) {
    console.error('❌ Erro ao carregar favoritos:', error);
    hideLoading();
    showToast('Erro ao carregar favoritos', 'error');
  }
}

async function loadTrending() {
  console.log('🔥 Carregando trending...');
  // Implementar quando necessário
  showToast('Funcionalidade em desenvolvimento', 'info');
}

// ==================== BUSCA ====================

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    clearTimeout(searchTimeout);
    
    if (query.length === 0) {
      loadHomeContent();
      return;
    }

    if (query.length < 2) return;

    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 500);
  });
}

// ==================== PERFIL ====================

function openProfileModal() {
  // Implementar modal de perfil
  console.log('📝 Abrir perfil');
}

// ==================== INICIALIZAÇÃO ====================

async function init() {
  console.log('🚀 Iniciando aplicação...');

  try {
    // ✅ VERIFICAÇÃO SIMPLES E DIRETA DA API
    if (typeof window.api === 'undefined' || !window.api) {
      throw new Error('API Service não carregado. Verifique se api-service.js está incluído antes deste script.');
    }

    console.log('✅ API disponível:', window.api);

    // Verificar autenticação
    currentUser = await checkAuth();
    
    if (!currentUser) {
      window.location.href = 'index.html';
      return;
    }

    document.getElementById('user-email').textContent = currentUser.email;

    // Verificar assinatura
    currentSubscription = await checkSubscription(currentUser.id);

    if (!currentSubscription) {
      showToast('Assinatura não encontrada', 'error');
      setTimeout(() => window.location.href = 'index.html', 2000);
      return;
    }

    console.log('✅ Configurando event listeners...');
    
    // Setup de eventos
    setupFilters();
    setupSearch();

    // Botão de logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    // Carregar dados
    console.log('📦 Carregando dados do usuário...');
    await Promise.all([
      loadFavorites(),
      loadWatchHistory()
    ]);

    // Carregar conteúdo
    console.log('📺 Carregando conteúdo inicial...');
    await loadHomeContent();

    console.log('✅ Aplicação inicializada com sucesso!');

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    hideLoading();
    showErrorMessage(error.message);
  }
}

// ==================== CARREGAMENTO ====================

console.log('📄 DOM Carregado');

// ✅ INICIALIZAR IMEDIATAMENTE SE API JÁ EXISTE
if (typeof window.api !== 'undefined' && window.api) {
  console.log('✅ API já disponível, iniciando...');
  document.addEventListener('DOMContentLoaded', init);
} else {
  console.log('⏳ Aguardando API carregar...');
  // Se a API não existe ainda, aguardar um pouco
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      console.log('🎯 Tentando iniciar após delay...');
      if (typeof window.api !== 'undefined' && window.api) {
        init();
      } else {
        console.error('❌ API ainda não disponível');
        showErrorMessage('Erro ao carregar serviço de API. Recarregue a página.');
      }
    }, 500);
  });
}

// Tornar funções disponíveis globalmente
window.watchAnime = watchAnime;
window.showAnimeInfo = showAnimeInfo;
window.toggleFavorite = toggleFavorite;
window.openProfileModal = openProfileModal;

console.log('✅ content-streaming.js carregado!');