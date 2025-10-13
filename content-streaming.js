// content-streaming.js
// Lógica principal da página de streaming

// ==================== UTILITÁRIOS DE LOADING ====================

function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'flex';
    console.log('✅ Loading exibido');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.style.display = 'none';
    console.log('✅ Loading ocultado');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#ef4444' : 
                          type === 'success' ? '#10b981' : '#667eea';
  
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showError(message) {
  console.error('❌ Erro ao inicializar aplicação');
  hideLoading();
  showToast(message, 'error');
  
  // Mostrar mensagem de erro no container principal
  const mainContent = document.getElementById('main-content');
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="no-results">
        <h3>❌ Erro ao carregar conteúdo</h3>
        <p>${message}</p>
        <button class="btn-primary" onclick="location.reload()">🔄 Tentar Novamente</button>
      </div>
    `;
  }
}

// ==================== AUTENTICAÇÃO ====================

async function checkAuth() {
  try {
    const { data: { user }, error } = await window.supabase.auth.getUser();
    
    if (error) throw error;
    
    if (!user) {
      console.log('❌ Usuário não autenticado');
      return null;
    }
    
    console.log('✅ Usuário autenticado:', user.email);
    return user;
    
  } catch (error) {
    console.error('❌ Erro ao verificar autenticação:', error);
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
      if (error.code === 'PGRST116') {
        console.log('⚠️ Nenhuma assinatura ativa encontrada');
        return null;
      }
      throw error;
    }
    
    console.log('✅ Assinatura encontrada:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Erro ao verificar assinatura:', error);
    return null;
  }
}

// ==================== FAVORITOS ====================

let userFavorites = [];

async function loadFavorites(userId) {
  try {
    const { data, error } = await window.supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    userFavorites = data.map(fav => fav.anime_id);
    console.log('✅ Favoritos carregados:', userFavorites.length);
    
  } catch (error) {
    console.error('❌ Erro ao carregar favoritos:', error);
    userFavorites = [];
  }
}

async function toggleFavorite(animeId, animeData) {
  try {
    const user = await checkAuth();
    if (!user) return;
    
    const isFavorite = userFavorites.includes(animeId);
    
    if (isFavorite) {
      // Remover dos favoritos
      const { error } = await window.supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('anime_id', animeId);
      
      if (error) throw error;
      
      userFavorites = userFavorites.filter(id => id !== animeId);
      showToast('❤️ Removido dos favoritos', 'success');
      
    } else {
      // Adicionar aos favoritos
      const { error } = await window.supabase
        .from('favorites')
        .insert({
          user_id: user.id,
          anime_id: animeId,
          anime_name: animeData.name,
          anime_poster: animeData.poster,
          added_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      userFavorites.push(animeId);
      showToast('❤️ Adicionado aos favoritos', 'success');
    }
    
    // Atualizar UI
    updateFavoriteButtons();
    
  } catch (error) {
    console.error('❌ Erro ao alternar favorito:', error);
    showToast('Erro ao atualizar favoritos', 'error');
  }
}

function updateFavoriteButtons() {
  document.querySelectorAll('.card-favorite').forEach(btn => {
    const animeId = btn.dataset.animeId;
    if (userFavorites.includes(animeId)) {
      btn.classList.add('active');
      btn.textContent = '❤️';
    } else {
      btn.classList.remove('active');
      btn.textContent = '🤍';
    }
  });
}

// ==================== HISTÓRICO ====================

let userHistory = [];

async function loadHistory(userId) {
  try {
    const { data, error } = await window.supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .order('last_watched', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    userHistory = data;
    console.log('✅ Histórico carregado:', userHistory.length);
    
    // Renderizar Continue Assistindo
    renderContinueWatching();
    
  } catch (error) {
    console.error('❌ Erro ao carregar histórico:', error);
    userHistory = [];
  }
}

async function saveToHistory(userId, animeId, animeData, episodeNumber, progress) {
  try {
    const { data, error } = await window.supabase
      .from('watch_history')
      .upsert({
        user_id: userId,
        anime_id: animeId,
        anime_name: animeData.name,
        anime_poster: animeData.poster,
        episode_number: episodeNumber,
        progress_seconds: Math.floor(progress),
        last_watched: new Date().toISOString()
      }, {
        onConflict: 'user_id,anime_id'
      });
    
    if (error) throw error;
    
  } catch (error) {
    console.error('❌ Erro ao salvar histórico:', error);
  }
}

function renderContinueWatching() {
  const section = document.getElementById('continue-watching-section');
  const grid = document.getElementById('continue-grid');
  
  if (!section || !grid) return;
  
  if (userHistory.length === 0) {
    section.style.display = 'none';
    return;
  }
  
  section.style.display = 'block';
  
  grid.innerHTML = userHistory.map(item => {
    const progressPercent = (item.progress_seconds / (item.episode_duration || 1400)) * 100;
    
    return `
      <div class="content-card" onclick="window.location.href='player.html?id=${item.anime_id}&ep=${item.episode_number}'">
        <div class="card-image">
          <img src="${item.anime_poster}" alt="${item.anime_name}" loading="lazy">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
        <div class="card-info">
          <h4 class="card-title">${item.anime_name}</h4>
          <div class="card-meta">
            <span>EP ${item.episode_number}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== CARREGAMENTO DE CONTEÚDO ====================

async function loadHomeContent() {
  console.log('📺 Carregando conteúdo home...');
  
  try {
    showLoading();
    
    // ✅ AGUARDAR 2 SEGUNDOS ANTES DA PRIMEIRA REQUISIÇÃO
    console.log('⏳ Aguardando 2s antes de fazer requisição...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const homeData = await window.api.getHome();
    
    console.log('✅ Home data recebida:', homeData);
    console.log('📊 Estrutura completa:', JSON.stringify(homeData, null, 2));
    
    // ✅ VALIDAÇÃO MELHORADA - Verificar múltiplas estruturas possíveis
    if (!homeData) {
      throw new Error('Nenhum dado retornado da API');
    }
    
    // Tentar diferentes estruturas de resposta
    let sections = [];
    
    if (homeData.data && homeData.data.sections) {
      // Estrutura: { success: true, data: { sections: [...] } }
      sections = homeData.data.sections;
    } else if (homeData.sections) {
      // Estrutura: { success: true, sections: [...] }
      sections = homeData.sections;
    } else if (Array.isArray(homeData.data)) {
      // Estrutura: { success: true, data: [...] }
      sections = homeData.data;
    } else if (Array.isArray(homeData)) {
      // Estrutura: [...]
      sections = homeData;
    }
    
    console.log('📦 Seções encontradas:', sections.length, sections);
    
    const container = document.getElementById('dynamic-content-container');
    if (!container) {
      throw new Error('Container não encontrado');
    }
    
    // Limpar container
    container.innerHTML = '';
    
    // Se não encontrou seções válidas, tentar carregar trending
    if (!sections || sections.length === 0) {
      console.warn('⚠️ Nenhuma seção encontrada, carregando trending...');
      await loadTrendingAnimes();
      hideLoading();
      return;
    }
    
    // Renderizar seções
    for (const section of sections) {
      if (!section.animes || section.animes.length === 0) {
        console.warn('⚠️ Seção sem animes:', section.title);
        continue;
      }
      
      console.log('✅ Renderizando seção:', section.title, `(${section.animes.length} animes)`);
      
      const sectionHtml = `
        <section class="content-section">
          <div class="section-header">
            <h3>${section.title || 'Seção'}</h3>
          </div>
          <div class="content-grid">
            ${section.animes.map(anime => createAnimeCard(anime)).join('')}
          </div>
        </section>
      `;
      
      container.innerHTML += sectionHtml;
    }
    
    console.log('✅ Conteúdo renderizado com sucesso!');
    hideLoading();
    
  } catch (error) {
    console.error('❌ Erro ao carregar home:', error);
    console.error('📊 Stack trace:', error.stack);
    hideLoading();
    showError(`Não foi possível carregar o conteúdo: ${error.message}`);
  }
}

async function loadTrendingAnimes() {
  try {
    const trendingData = await window.api.search('', { type: 'tv', status: 'ongoing' });
    
    if (!trendingData || !trendingData.data || !trendingData.data.animes) {
      console.warn('⚠️ Nenhum anime trending encontrado');
      return;
    }
    
    const container = document.getElementById('dynamic-content-container');
    if (!container) return;
    
    container.innerHTML = `
      <section class="content-section">
        <div class="section-header">
          <h3>🔥 Em Alta</h3>
        </div>
        <div class="content-grid">
          ${trendingData.data.animes.map(anime => createAnimeCard(anime)).join('')}
        </div>
      </section>
    `;
    
  } catch (error) {
    console.error('❌ Erro ao carregar trending:', error);
  }
}

function createAnimeCard(anime) {
  const isFavorite = userFavorites.includes(anime.id);
  
  return `
    <div class="content-card">
      <div class="card-image">
        <img src="${anime.poster}" alt="${anime.name}" loading="lazy">
        
        ${anime.type ? `<div class="card-badge">${anime.type}</div>` : ''}
        
        <div class="card-overlay">
          <div class="overlay-details">
            <h4 class="card-title" style="color: white;">${anime.name}</h4>
            <div class="card-meta">
              ${anime.rating ? `<span>⭐ ${anime.rating}</span>` : ''}
              ${anime.episodes?.sub ? `<span>📺 ${anime.episodes.sub} eps</span>` : ''}
            </div>
          </div>
          
          <div class="card-actions">
            <button class="btn-play" onclick="event.stopPropagation(); window.location.href='player.html?id=${anime.id}&ep=1'">
              ▶️ Assistir
            </button>
            <button class="btn-info" onclick="event.stopPropagation(); showAnimeInfo('${anime.id}')">
              ℹ️ Info
            </button>
          </div>
        </div>
        
        <button class="card-favorite ${isFavorite ? 'active' : ''}" 
                data-anime-id="${anime.id}"
                onclick="event.stopPropagation(); toggleFavorite('${anime.id}', ${JSON.stringify(anime).replace(/"/g, '&quot;')})">
          ${isFavorite ? '❤️' : '🤍'}
        </button>
      </div>
      
      <div class="card-info">
        <h4 class="card-title">${anime.name}</h4>
        <div class="card-meta">
          ${anime.rating ? `<span>⭐ ${anime.rating}</span>` : ''}
          ${anime.type ? `<span>${anime.type}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ==================== BUSCA ====================

let searchTimeout;

function setupSearch() {
  const searchInput = document.getElementById('search-input');
  if (!searchInput) return;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    
    const query = e.target.value.trim();
    
    if (query.length < 2) {
      loadHomeContent();
      return;
    }
    
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 500);
  });
}

async function performSearch(query) {
  try {
    showLoading();
    
    const searchData = await window.api.search(query);
    
    if (!searchData || !searchData.data || !searchData.data.animes) {
      throw new Error('Nenhum resultado encontrado');
    }
    
    const container = document.getElementById('dynamic-content-container');
    if (!container) return;
    
    container.innerHTML = `
      <section class="content-section">
        <div class="section-header">
          <h3>🔍 Resultados para "${query}"</h3>
        </div>
        <div class="content-grid">
          ${searchData.data.animes.map(anime => createAnimeCard(anime)).join('')}
        </div>
      </section>
    `;
    
    hideLoading();
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    hideLoading();
    showToast('Erro ao buscar animes', 'error');
  }
}

// ==================== NAVEGAÇÃO ====================

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      // Remover active de todos
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      
      // Adicionar active no clicado
      btn.classList.add('active');
      
      const filter = btn.dataset.filter;
      
      try {
        showLoading();
        
        switch(filter) {
          case 'all':
            await loadHomeContent();
            break;
          case 'anime':
            await loadTrendingAnimes();
            break;
          case 'trending':
            await loadTrendingAnimes();
            break;
          case 'favorites':
            await loadFavoritesView();
            break;
          default:
            await loadHomeContent();
        }
        
        hideLoading();
        
      } catch (error) {
        console.error('❌ Erro na navegação:', error);
        hideLoading();
        showError('Erro ao carregar conteúdo');
      }
    });
  });
}

async function loadFavoritesView() {
  const container = document.getElementById('dynamic-content-container');
  if (!container) return;
  
  if (userFavorites.length === 0) {
    container.innerHTML = `
      <div class="no-results">
        <h3>❤️ Nenhum favorito ainda</h3>
        <p>Adicione animes aos seus favoritos para vê-los aqui!</p>
      </div>
    `;
    return;
  }
  
  try {
    showLoading();
    
    // Carregar informações dos animes favoritos
    const favoritesPromises = userFavorites.map(animeId => 
      window.api.getAnimeInfo(animeId).catch(() => null)
    );
    
    const favoritesData = await Promise.all(favoritesPromises);
    const validFavorites = favoritesData.filter(data => data && data.data);
    
    container.innerHTML = `
      <section class="content-section">
        <div class="section-header">
          <h3>❤️ Meus Favoritos</h3>
        </div>
        <div class="content-grid">
          ${validFavorites.map(fav => createAnimeCard(fav.data.anime.info)).join('')}
        </div>
      </section>
    `;
    
    hideLoading();
    
  } catch (error) {
    console.error('❌ Erro ao carregar favoritos:', error);
    hideLoading();
  }
}

// ==================== LOGOUT ====================

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;
  
  logoutBtn.addEventListener('click', async () => {
    try {
      const { error } = await window.supabase.auth.signOut();
      if (error) throw error;
      window.location.href = 'index.html';
    } catch (error) {
      console.error('❌ Erro ao fazer logout:', error);
      showToast('Erro ao fazer logout', 'error');
    }
  });
}

// ==================== MODAL DE INFORMAÇÕES ====================

async function showAnimeInfo(animeId) {
  try {
    showLoading();
    
    const animeData = await window.api.getAnimeInfo(animeId);
    
    if (!animeData || !animeData.data) {
      throw new Error('Informações do anime não encontradas');
    }
    
    const anime = animeData.data.anime.info;
    const moreInfo = animeData.data.anime.moreInfo;
    const isFavorite = userFavorites.includes(animeId);
    
    const modalHtml = `
      <div class="info-modal-overlay" onclick="closeInfoModal(event)">
        <div class="info-modal" onclick="event.stopPropagation()">
          <button class="btn-close" onclick="closeInfoModal()">✕</button>
          
          <div class="info-content">
            <div>
              <img src="${anime.poster}" alt="${anime.name}">
            </div>
            
            <div class="info-details">
              <h2>${anime.name}</h2>
              
              <div class="info-meta">
                ${anime.stats?.rating ? `<span>⭐ ${anime.stats.rating}</span>` : ''}
                ${anime.stats?.type ? `<span>📺 ${anime.stats.type}</span>` : ''}
                ${anime.stats?.duration ? `<span>⏱️ ${anime.stats.duration}</span>` : ''}
                ${moreInfo?.status ? `<span>🎬 ${moreInfo.status}</span>` : ''}
              </div>
              
              <p>${anime.description || 'Sem descrição disponível'}</p>
              
              ${moreInfo?.genres ? `
                <div style="margin-top: 15px;">
                  <strong style="color: white;">Gêneros:</strong>
                  <p style="color: #9ca3af;">${moreInfo.genres}</p>
                </div>
              ` : ''}
              
              ${moreInfo?.studios ? `
                <div style="margin-top: 10px;">
                  <strong style="color: white;">Estúdio:</strong>
                  <p style="color: #9ca3af;">${moreInfo.studios}</p>
                </div>
              ` : ''}
              
              <div class="info-actions">
                <button class="btn-primary" onclick="window.location.href='player.html?id=${animeId}&ep=1'">
                  ▶️ Assistir Agora
                </button>
                <button class="btn-secondary" onclick="toggleFavorite('${animeId}', ${JSON.stringify(anime).replace(/"/g, '&quot;')}); closeInfoModal()">
                  ${isFavorite ? '❤️ Remover dos Favoritos' : '🤍 Adicionar aos Favoritos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    hideLoading();
    
  } catch (error) {
    console.error('❌ Erro ao carregar informações:', error);
    hideLoading();
    showToast('Erro ao carregar informações', 'error');
  }
}

function closeInfoModal(event) {
  if (event && event.target.className !== 'info-modal-overlay') return;
  
  const modal = document.querySelector('.info-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// ==================== MODAL DO PERFIL ====================

async function openProfileModal() {
  try {
    const user = await checkAuth();
    if (!user) return;
    
    const subscription = await checkSubscription(user.id);
    
    const modalHtml = `
      <div class="profile-modal-overlay" onclick="closeProfileModal(event)">
        <div class="profile-modal" onclick="event.stopPropagation()">
          <button class="btn-close" onclick="closeProfileModal()">✕</button>
          
          <div class="profile-header">
            <div class="profile-avatar">
              ${user.email.charAt(0).toUpperCase()}
            </div>
            <div class="profile-info">
              <h2>${user.email}</h2>
              ${subscription ? `
                <span class="profile-badge">
                  👑 ${window.PLANS[subscription.plan_type]?.name || 'Premium'}
                </span>
              ` : '<span style="color: #9ca3af;">Sem assinatura ativa</span>'}
            </div>
          </div>
          
          <div class="profile-stats">
            <div class="stat-card">
              <span class="stat-icon">❤️</span>
              <div class="stat-info">
                <h3>${userFavorites.length}</h3>
                <p>Favoritos</p>
              </div>
            </div>
            
            <div class="stat-card">
              <span class="stat-icon">📺</span>
              <div class="stat-info">
                <h3>${userHistory.length}</h3>
                <p>Assistidos</p>
              </div>
            </div>
          </div>
          
          ${subscription ? `
            <div class="profile-section">
              <h3>💳 Assinatura</h3>
              <div class="payment-info">
                <p><strong>Plano:</strong> ${window.PLANS[subscription.plan_type]?.name || 'Premium'}</p>
                <p><strong>Status:</strong> <span class="status-approved">Ativo</span></p>
                <p><strong>Expira em:</strong> ${new Date(subscription.expires_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          ` : ''}
          
          ${userHistory.length > 0 ? `
            <div class="profile-section">
              <h3>⏱️ Histórico Recente</h3>
              <div class="history-list">
                ${userHistory.slice(0, 5).map(item => `
                  <div class="history-item" onclick="window.location.href='player.html?id=${item.anime_id}&ep=${item.episode_number}'">
                    <img src="${item.anime_poster}" alt="${item.anime_name}">
                    <div class="history-details">
                      <h4>${item.anime_name}</h4>
                      <p>Episódio ${item.episode_number}</p>
                      <p class="history-date">${new Date(item.last_watched).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : '<div class="no-history">📺 Nenhum histórico ainda</div>'}
          
          <div class="profile-actions">
            <button class="btn-primary" onclick="window.location.href='content.html'">
              🏠 Página Inicial
            </button>
            <button class="btn-secondary" onclick="closeProfileModal()">
              ✕ Fechar
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
  } catch (error) {
    console.error('❌ Erro ao abrir perfil:', error);
    showToast('Erro ao carregar perfil', 'error');
  }
}

function closeProfileModal(event) {
  if (event && event.target.className !== 'profile-modal-overlay') return;
  
  const modal = document.querySelector('.profile-modal-overlay');
  if (modal) {
    modal.remove();
  }
}

// Expor função para o HTML
window.openProfileModal = openProfileModal;
window.showAnimeInfo = showAnimeInfo;
window.toggleFavorite = toggleFavorite;
window.closeInfoModal = closeInfoModal;
window.closeProfileModal = closeProfileModal;

// ==================== INICIALIZAÇÃO ====================

async function init() {
  console.log('🚀 Iniciando aplicação...');
  
  try {
    // ✅ Verificar se API está disponível
    if (typeof window.api === 'undefined') {
      throw new Error('API Service não carregado');
    }
    
    console.log('✅ API disponível:', window.api);
    
    // Verificar autenticação
    const user = await checkAuth();
    
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    
    // Mostrar email do usuário
    const userEmailElement = document.getElementById('user-email');
    if (userEmailElement) {
      userEmailElement.textContent = user.email;
    }
    
    // Verificar assinatura
    const subscription = await checkSubscription(user.id);
    
    if (!subscription) {
      showError('Você não possui uma assinatura ativa. Assine para acessar o conteúdo!');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
      return;
    }
    
    // Verificar se assinatura expirou
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);
    
    if (now > expiresAt) {
      showError('Sua assinatura expirou. Renove para continuar assistindo!');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 3000);
      return;
    }
    
    console.log('✅ Configurando event listeners...');
    
    // Configurar navegação e busca
    setupNavigation();
    setupSearch();
    setupLogout();
    
    console.log('📦 Carregando dados do usuário...');
    
    // Carregar dados do usuário
    await loadFavorites(user.id);
    await loadHistory(user.id);
    
    console.log('📺 Carregando conteúdo inicial...');
    
    // Carregar conteúdo inicial
    await loadHomeContent();
    
    console.log('✅ Aplicação inicializada com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro fatal na inicialização:', error);
    showError(`Erro ao inicializar: ${error.message}`);
  }
}

// ==================== AGUARDAR DOM E API ====================

console.log('🔍 Verificando API no início do script...');
console.log('🔍 window.api existe?', typeof window.api !== 'undefined');
console.log('🔍 window.api:', window.api);

// Aguardar carregamento do DOM
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Carregado');
  
  // Verificar se API já está disponível
  if (typeof window.api !== 'undefined') {
    console.log('✅ API já disponível, iniciando...');
    init();
  } else {
    // Aguardar API ser carregada
    console.log('⏳ Aguardando API...');
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkAPI = setInterval(() => {
      attempts++;
      
      if (typeof window.api !== 'undefined') {
        console.log('✅ API carregada após', attempts, 'tentativas');
        clearInterval(checkAPI);
        init();
      } else if (attempts >= maxAttempts) {
        console.error('❌ API não foi carregada após', maxAttempts, 'tentativas');
        clearInterval(checkAPI);
        showError('Erro ao carregar serviços da aplicação. Recarregue a página.');
      }
    }, 100);
  }
});

console.log('✅ content-streaming.js carregado!');