// content-streaming.js - VERSÃO CORRIGIDA

let currentUser = null;
let favorites = [];
let currentPage = 1;
let currentFilter = 'home';
let currentGenre = null;
let isLoading = false;
let hasNextPage = true;
let allAnimes = [];

// ==========================================
// INICIALIZAÇÃO
// ==========================================
document.addEventListener('DOMContentLoaded', init);

async function init() {
  console.log('🚀 Iniciando YayaAnimes...');
  
  try {
    setupEventListeners();
    loadFavorites();
    await waitForAPI();
    await verifyAccessAndLoadContent();
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    showError('Erro ao inicializar aplicação');
  }
}

// ==========================================
// CONFIGURAR EVENT LISTENERS
// ==========================================
function setupEventListeners() {
  // Busca
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 500));
  }

  // Botões da sidebar
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const category = btn.dataset.category;
      if (category) {
        currentPage = 1;
        currentFilter = category;
        currentGenre = null;
        
        if (category === 'home') {
          loadHomePage();
        } else {
          loadAnimesByCategory(category, 1);
        }
      }
    });
  });

  // Botões de gêneros
  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.genre-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const genre = btn.dataset.genre;
      if (genre) {
        currentPage = 1;
        currentFilter = null;
        currentGenre = genre;
        loadAnimesByGenre(genre, 1);
      }
    });
  });

  // Scroll infinito
  window.addEventListener('scroll', handleScroll);

  // Botão de logout
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
}

// ==========================================
// AGUARDAR API
// ==========================================
async function waitForAPI() {
  let attempts = 0;
  const maxAttempts = 50;

  while (!window.AnimeAPI && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 100));
    attempts++;
  }

  if (!window.AnimeAPI) {
    throw new Error('API não carregada');
  }

  console.log('✅ AnimeAPI encontrada');
}

// ==========================================
// VERIFICAR ACESSO E CARREGAR CONTEÚDO
// ==========================================
async function verifyAccessAndLoadContent() {
  console.log('🔐 Verificando acesso...');

  try {
    const { data: { user } } = await window.supabase.auth.getUser();

    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    currentUser = user;

    const { data: subscription } = await window.supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!subscription) {
      window.location.href = 'index.html';
      return;
    }

    const expiresAt = new Date(subscription.expires_at);
    const now = new Date();

    if (expiresAt <= now) {
      await window.supabase
        .from('subscriptions')
        .update({ status: 'expired' })
        .eq('user_id', user.id);

      alert('Sua assinatura expirou. Por favor, renove para continuar.');
      window.location.href = 'index.html';
      return;
    }

    console.log('✅ Assinatura válida');
    await loadHomePage();

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    window.location.href = 'index.html';
  }
}

// ==========================================
// CARREGAR HOME PAGE
// ==========================================
async function loadHomePage() {
  console.log('📺 Carregando home...');
  showLoadingState();
  currentFilter = 'home';
  
  try {
    const response = await window.AnimeAPI.getHomePage();
    let animes = [];
    
    if (response.success && response.data) {
      const sections = [
        'trending',
        'spotlights', 
        'latestEpisodes',
        'topUpcoming',
        'topAiring',
        'mostPopular',
        'latestCompleted'
      ];
      
      const seen = new Set();
      
      for (const section of sections) {
        if (response.data[section] && Array.isArray(response.data[section])) {
          response.data[section].forEach(anime => {
            if (!seen.has(anime.id) && animes.length < 50) {
              seen.add(anime.id);
              animes.push(anime);
            }
          });
          if (animes.length >= 50) break;
        }
      }
      
      console.log(`✅ ${animes.length} animes carregados`);
    }
    
    if (animes.length === 0) {
      showEmptyState('Nenhum anime disponível no momento');
    } else {
      allAnimes = animes;
      hasNextPage = false;
      displayContent(animes);
    }
    
  } catch (error) {
    console.error('❌ Erro ao carregar home:', error);
    showError('Erro ao carregar conteúdo');
  }
}

// ==========================================
// CARREGAR ANIMES POR CATEGORIA
// ==========================================
async function loadAnimesByCategory(category, page = 1) {
  console.log(`📺 Carregando ${category} - Página ${page}`);
  
  if (page === 1) {
    showLoadingState();
  } else {
    showLoadMoreIndicator(true);
  }
  
  isLoading = true;
  
  try {
    const response = await window.AnimeAPI.getAnimesByCategory(category, page);
    
    const newAnimes = Array.isArray(response.data) 
      ? response.data 
      : (response.data.response || response.data.animes || []);
    
    console.log(`✅ ${newAnimes.length} animes carregados`);
    
    allAnimes = page === 1 ? newAnimes : [...allAnimes, ...newAnimes];
    hasNextPage = response.data.hasNextPage !== false && newAnimes.length >= 20;
    
    if (page === 1) {
      displayContent(allAnimes);
    } else {
      appendContent(newAnimes);
    }
    
    showLoadMoreIndicator(false);
    
  } catch (error) {
    console.error('❌ Erro ao carregar categoria:', error);
    showError('Erro ao carregar categoria');
    showLoadMoreIndicator(false);
  } finally {
    isLoading = false;
  }
}

// ==========================================
// CARREGAR ANIMES POR GÊNERO
// ==========================================
async function loadAnimesByGenre(genreName, page = 1) {
  console.log(`🎭 Carregando gênero ${genreName} - Página ${page}`);
  
  if (page === 1) {
    showLoadingState();
  } else {
    showLoadMoreIndicator(true);
  }
  
  isLoading = true;
  
  try {
    const response = await window.AnimeAPI.getAnimesByGenre(genreName, page);
    
    const newAnimes = Array.isArray(response.data)
      ? response.data
      : (response.data.response || response.data.animes || []);
    
    console.log(`✅ ${newAnimes.length} animes carregados`);
    
    allAnimes = page === 1 ? newAnimes : [...allAnimes, ...newAnimes];
    hasNextPage = newAnimes.length >= 20;
    
    if (page === 1) {
      displayContent(allAnimes);
    } else {
      appendContent(newAnimes);
    }
    
    showLoadMoreIndicator(false);
    
  } catch (error) {
    console.error('❌ Erro ao carregar gênero:', error);
    showError('Erro ao carregar gênero');
    showLoadMoreIndicator(false);
  } finally {
    isLoading = false;
  }
}

// ==========================================
// BUSCA
// ==========================================
async function handleSearch(e) {
  const query = e.target.value.trim();
  
  if (!query) {
    currentPage = 1;
    allAnimes = [];
    currentFilter = 'home';
    currentGenre = null;
    loadHomePage();
    return;
  }
  
  console.log('🔍 Buscando:', query);
  showLoadingState();
  
  try {
    const response = await window.AnimeAPI.search(query, 1);
    
    const results = Array.isArray(response.data)
      ? response.data
      : (response.data.animes || []);
    
    console.log(`✅ ${results.length} resultados encontrados`);
    
    if (results.length === 0) {
      showEmptyState('Nenhum anime encontrado para sua busca');
    } else {
      allAnimes = results;
      currentFilter = null;
      currentGenre = null;
      hasNextPage = false;
      displayContent(results);
    }
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    showError('Erro ao buscar animes');
  }
}

// ==========================================
// SCROLL INFINITO
// ==========================================
function handleScroll() {
  if (isLoading || !hasNextPage) return;

  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.documentElement.scrollHeight - 500;

  if (scrollPosition >= threshold) {
    currentPage++;
    
    if (currentGenre) {
      loadAnimesByGenre(currentGenre, currentPage);
    } else if (currentFilter && currentFilter !== 'home') {
      loadAnimesByCategory(currentFilter, currentPage);
    }
  }
}

// ==========================================
// EXIBIR CONTEÚDO
// ==========================================
function displayContent(animes) {
  const container = document.getElementById('dynamic-content-container');
  if (!container) return;

  container.innerHTML = '';

  if (animes.length === 0) {
    showEmptyState('Nenhum anime disponível');
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'content-grid';

  animes.forEach(anime => {
    const card = createContentCard(anime);
    grid.appendChild(card);
  });

  container.appendChild(grid);
  hideLoadingState();
}

// ==========================================
// ADICIONAR MAIS CONTEÚDO
// ==========================================
function appendContent(animes) {
  const container = document.getElementById('dynamic-content-container');
  if (!container) return;

  let grid = container.querySelector('.content-grid');
  
  if (!grid) {
    grid = document.createElement('div');
    grid.className = 'content-grid';
    container.appendChild(grid);
  }

  animes.forEach(anime => {
    const card = createContentCard(anime);
    grid.appendChild(card);
  });
}

// ==========================================
// CRIAR CARD - CORRIGIDO ✨
// ==========================================
function createContentCard(anime) {
  const card = document.createElement('div');
  card.className = 'content-card';
  
  const animeId = anime.id || anime.mal_id;
  const title = anime.title || anime.name || 'Anime';
  const poster = anime.poster || anime.image || '/placeholder.jpg';
  const rating = anime.rating || anime.score || 'N/A';
  
  // CORRIGIDO: Buscar episódios corretamente
  let episodes = '?';
  if (anime.episodes) {
    if (typeof anime.episodes === 'object') {
      episodes = anime.episodes.sub || anime.episodes.dub || '?';
    } else {
      episodes = anime.episodes;
    }
  }
  
  const type = anime.type || 'TV';
  const isFavorite = favorites.some(f => f.id === animeId);
  
  card.innerHTML = `
    <div class="card-poster">
      <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='/placeholder.jpg'">
      <div class="card-overlay">
        <button class="play-btn" data-anime-id="${animeId}" data-anime-title="${title}">
          <i class="fas fa-play"></i> Assistir
        </button>
      </div>
    </div>
    <div class="card-info">
      <h3 class="card-title" title="${title}">${title}</h3>
      <div class="card-meta">
        <span class="card-type">${type}</span>
        <span class="card-episodes">${episodes} eps</span>
        <span class="card-rating">⭐ ${rating}</span>
      </div>
      <button class="favorite-btn ${isFavorite ? 'active' : ''}" 
              data-anime-id="${animeId}"
              data-anime-title="${title}"
              data-anime-poster="${poster}">
        <i class="fas fa-heart"></i>
      </button>
    </div>
  `;
  
  // Event listeners
  const playBtn = card.querySelector('.play-btn');
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.animeId;
    const title = e.currentTarget.dataset.animeTitle;
    openAnimeDetails(id, title);
  });
  
  const favBtn = card.querySelector('.favorite-btn');
  favBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const id = e.currentTarget.dataset.animeId;
    const title = e.currentTarget.dataset.animeTitle;
    const poster = e.currentTarget.dataset.animePoster;
    toggleFavorite(e, id, title, poster);
  });
  
  return card;
}

// ==========================================
// ABRIR DETALHES DO ANIME - CORRIGIDO ✨
// ==========================================
function openAnimeDetails(animeId, animeTitle) {
  console.log(`🎬 Abrindo anime: ${animeId}`);
  window.location.href = `anime.html?id=${animeId}&title=${encodeURIComponent(animeTitle || 'Anime')}`;
}

// Expor globalmente
window.openAnimeDetails = openAnimeDetails;

// ==========================================
// FAVORITOS
// ==========================================
function loadFavorites() {
  const stored = localStorage.getItem('yaya_favorites');
  favorites = stored ? JSON.parse(stored) : [];
}

function saveFavorites() {
  localStorage.setItem('yaya_favorites', JSON.stringify(favorites));
}

async function toggleFavorite(event, animeId, animeTitle, animePoster) {
  event.stopPropagation();
  
  const index = favorites.findIndex(f => f.id === animeId);
  
  if (index > -1) {
    favorites.splice(index, 1);
    showNotification('Removido dos favoritos', 'info');
  } else {
    favorites.push({
      id: animeId,
      title: animeTitle,
      poster: animePoster,
      addedAt: new Date().toISOString()
    });
    showNotification('Adicionado aos favoritos!', 'success');
  }
  
  saveFavorites();
  
  const btn = event.currentTarget;
  btn.classList.toggle('active');
  
  if (currentFilter === 'favorites') {
    displayFavorites();
  }
}

function displayFavorites() {
  console.log('❤️ Exibindo favoritos');
  
  if (favorites.length === 0) {
    showEmptyState('Nenhum favorito ainda. Adicione seus animes favoritos!');
    return;
  }
  
  displayContent(favorites);
}

// ==========================================
// ESTADOS DA UI
// ==========================================
function showLoadingState() {
  const container = document.getElementById('dynamic-content-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Carregando animes...</p>
    </div>
  `;
}

function hideLoadingState() {
  const loading = document.querySelector('.loading-state');
  if (loading) loading.remove();
}

function showLoadMoreIndicator(show) {
  let indicator = document.getElementById('load-more-indicator');
  
  if (show && !indicator) {
    indicator = document.createElement('div');
    indicator.id = 'load-more-indicator';
    indicator.className = 'loading-state';
    indicator.innerHTML = `
      <div class="spinner"></div>
      <p>Carregando mais...</p>
    `;
    document.body.appendChild(indicator);
  } else if (!show && indicator) {
    indicator.remove();
  }
}

function showEmptyState(message) {
  const container = document.getElementById('dynamic-content-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-inbox" style="font-size: 64px; color: #666; margin-bottom: 20px;"></i>
      <h3>Nenhum resultado encontrado</h3>
      <p>${message}</p>
    </div>
  `;
}

function showError(message) {
  const container = document.getElementById('dynamic-content-container');
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <i class="fas fa-exclamation-triangle" style="font-size: 64px; color: #e50914; margin-bottom: 20px;"></i>
      <h3>Erro</h3>
      <p>${message}</p>
      <button onclick="location.reload()" class="retry-btn" style="margin-top: 20px; padding: 12px 24px; background: #e50914; border: none; color: white; border-radius: 8px; cursor: pointer;">
        Tentar Novamente
      </button>
    </div>
  `;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 90px;
    right: 20px;
    background: ${type === 'success' ? '#10b981' : '#e50914'};
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease;
    font-weight: 600;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==========================================
// LOGOUT
// ==========================================
async function handleLogout() {
  const confirmLogout = confirm('Tem certeza que deseja sair?');
  
  if (confirmLogout) {
    try {
      await window.supabase.auth.signOut();
      window.location.href = 'index.html';
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao sair. Tente novamente.');
    }
  }
}

// ==========================================
// UTILITÁRIOS
// ==========================================
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ==========================================
// ANIMAÇÕES CSS
// ==========================================
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

console.log('✅ content-streaming.js carregado!');