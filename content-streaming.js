// content-streaming.js
// Plataforma de streaming com API - Versão Otimizada

// ===========================
// CONFIGURAÇÃO
// ===========================

const USE_API = true;
let currentUser = null;
let currentSubscription = null;
let watchHistory = [];
let contentDatabase = {
  animes: [],
  movies: [],
  series: [],
};

// ===========================
// INICIALIZAÇÃO
// ===========================

function init() {
  setupEventListeners();
  verifyAccessAndLoadContent();
  loadWatchHistory();
}

function setupEventListeners() {
  // Event listeners para navegação
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }

  // Filtros de categoria
  const filterButtons = document.querySelectorAll(".filter-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterContent(btn.dataset.filter);
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

// ===========================
// CONTROLE DE ACESSO
// ===========================

async function verifyAccessAndLoadContent() {
  const savedUser = localStorage.getItem("currentUser");
  const savedSubscription = localStorage.getItem("currentSubscription");

  if (savedUser && savedSubscription) {
    currentUser = JSON.parse(savedUser);
    currentSubscription = JSON.parse(savedSubscription);

    if (currentSubscription === "premium") {
      showPremiumContent();
      await loadContent();
    } else {
      showAccessDenied();
    }
  } else {
    showAccessDenied();
  }
}

function showAccessDenied() {
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="access-denied">
        <h2>🔒 Acesso Negado</h2>
        <p>Você precisa de uma assinatura Premium para acessar este conteúdo.</p>
        <button onclick="window.location.href='index.html'" class="btn-upgrade">
          Fazer Upgrade
        </button>
      </div>
    `;
  }
}

function showPremiumContent() {
  const accessDenied = document.querySelector(".access-denied");
  if (accessDenied) {
    accessDenied.style.display = "none";
  }

  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.style.display = "block";
  }
}

// ===========================
// CARREGAMENTO DE CONTEÚDO
// ===========================

async function loadContent() {
  showLoadingState();

  try {
    if (USE_API && window.AnimeAPI) {
      await loadContentFromAPI();
    } else {
      loadContentFromMock();
    }

    loadContinueWatching();
    hideLoadingState();
  } catch (error) {
    console.error("❌ Erro ao carregar conteúdo:", error);
    handleLoadError(error);
  }
}

async function loadContentFromAPI() {
  console.log("📡 Carregando dados da API...");

  const data = await window.AnimeAPI.loadContentForHomepage();

  const sections = [
    { title: "Animes em Destaque", data: data.spotlightAnimes },
    { title: "Animes Populares", data: data.mostPopularAnimes },
    { title: "Animes Mais Favoritados", data: data.mostFavoriteAnimes },
    { title: "Top 10 Animes", data: data.top10Animes },
    { title: "Animes em Tendência", data: data.trendingAnimes },
    { title: "Últimos Episódios", data: data.latestEpisodeAnimes },
    { title: "Recém-Completados", data: data.latestCompletedAnimes },
    { title: "Em Lançamento", data: data.topAiringAnimes },
    { title: "Próximos Lançamentos", data: data.topUpcomingAnimes },
  ];

  const dynamicContainer = document.getElementById("dynamic-content-container");
  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  sections.forEach(({ title, data }) => {
    if (data && data.length > 0) {
      renderSection(title, data, dynamicContainer);

      // Armazenar animes principais para busca
      if (title === "Animes em Tendência") {
        contentDatabase.animes = data;
      }
    }
  });

  // Esconder seção de fallback
  const fallbackSection = document.getElementById("animes-grid-section");
  if (fallbackSection) {
    fallbackSection.style.display = "none";
  }

  console.log("✅ Conteúdo da API carregado com sucesso!");
}

function loadContentFromMock() {
  console.log("💾 Carregando dados locais...");

  const mockAnimes = getMockData("anime");
  const mockMovies = getMockData("movie");
  const mockSeries = getMockData("series");

  contentDatabase.animes = mockAnimes;
  contentDatabase.movies = mockMovies;
  contentDatabase.series = mockSeries;

  renderContent("animes-grid", mockAnimes);

  const animesSection = document.getElementById("animes-grid-section");
  if (animesSection) {
    animesSection.style.display = "block";
  }
}

function handleLoadError(error) {
  hideLoadingState();
  showErrorMessage("Erro ao carregar conteúdo. Usando dados locais.");
  loadContentFromMock();
  loadContinueWatching();
}

// ===========================
// RENDERIZAÇÃO DE SEÇÕES
// ===========================

function renderSection(title, items, container) {
  const sectionId = generateSectionId(title);

  const section = document.createElement("section");
  section.className = "content-section";
  section.id = `${sectionId}-section`;

  section.innerHTML = `
    <div class="section-header">
      <h3>${title}</h3>
      <button class="btn-see-all" onclick="viewAllContent('${sectionId}')">
        Ver Todos →
      </button>
    </div>
    <div class="content-grid" id="${sectionId}-grid"></div>
  `;

  container.appendChild(section);
  renderContent(`${sectionId}-grid`, items);
}

function renderContent(gridId, items) {
  const grid = document.getElementById(gridId);
  if (!grid || !items || items.length === 0) return;

  grid.innerHTML = items.map((item) => createContentCard(item)).join("");
}

function createContentCard(item) {
  const escapedTitle = escapeHtml(item.title);
  const escapedType = escapeHtml(item.type);

  return `
    <div class="content-card" data-id="${item.id}" data-type="${escapedType}">
      <div class="card-image">
        <img src="${item.image}" alt="${escapedTitle}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
      </div>
      
      ${item.new ? '<span class="card-badge badge-new">NOVO</span>' : ""}
      ${item.hd ? '<span class="card-badge badge-hd">HD</span>' : ""}
      
      <div class="card-overlay">
        <div class="overlay-details">
          <h4 class="card-title">${escapedTitle}</h4>
          <div class="card-meta">
            <span class="card-rating">⭐ ${item.rating || "N/A"}</span>
            <span>${item.year || "N/A"}</span>
            ${item.episodes ? `<span>${item.episodes} eps</span>` : ""}
            ${item.duration ? `<span>${item.duration}</span>` : ""}
            ${item.seasons ? `<span>${item.seasons} temp</span>` : ""}
          </div>
        </div>

        <div class="card-actions">
          <button onclick="playContent(${
            item.id
          }, '${escapedType}')" class="btn-play">
            ▶️ Assistir
          </button>
          <button onclick="showInfo(${
            item.id
          }, '${escapedType}')" class="btn-info">
            ℹ️ Info
          </button>
          <button onclick="addToFavorites(${
            item.id
          }, '${escapedType}')" class="btn-favorite">
            ❤️
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===========================
// CONTINUE ASSISTINDO
// ===========================

function loadWatchHistory() {
  const saved = localStorage.getItem("watch_history");
  watchHistory = saved ? JSON.parse(saved) : [];
}

function saveWatchHistory() {
  localStorage.setItem("watch_history", JSON.stringify(watchHistory));
}

function loadContinueWatching() {
  const grid = document.getElementById("continue-grid");
  const section = document.getElementById("continue-watching-section");

  if (!grid || !section) return;

  if (watchHistory.length === 0) {
    section.style.display = "none";
    return;
  }

  section.style.display = "block";

  const recentItems = watchHistory
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, 6);

  grid.innerHTML = recentItems.map((item) => createContinueCard(item)).join("");
}

function createContinueCard(item) {
  const escapedTitle = escapeHtml(item.title);
  const escapedType = escapeHtml(item.type);

  return `
    <div class="content-card" data-id="${item.id}" data-type="${escapedType}">
      <div class="card-image">
        <img src="${item.image}" alt="${escapedTitle}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${item.progress}%;"></div>
      </div>
      
      <div class="card-overlay">
        <div class="overlay-details">
          <h4 class="card-title">${escapedTitle}</h4>
          <div class="card-meta">
            <span>⏱️ ${item.progress}% concluído</span>
          </div>
        </div>
        <div class="card-actions">
          <button onclick="playContent(${item.id}, '${escapedType}')" class="btn-play">
            ▶️ Continuar
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateWatchHistory(id, type, progress) {
  const existing = watchHistory.findIndex(
    (item) => item.id === id && item.type === type
  );

  const item = findContentById(id, type);
  if (!item) return;

  const historyItem = {
    id,
    type,
    title: item.title,
    image: item.image,
    progress,
    lastWatched: new Date().toISOString(),
    rating: item.rating,
    year: item.year,
  };

  if (existing >= 0) {
    watchHistory[existing] = historyItem;
  } else {
    watchHistory.unshift(historyItem);
  }

  // Limitar a 50 itens
  if (watchHistory.length > 50) {
    watchHistory = watchHistory.slice(0, 50);
  }

  saveWatchHistory();
  loadContinueWatching();
}

// ===========================
// BUSCA E FILTROS
// ===========================

function handleSearch(event) {
  const query = event.target.value.trim().toLowerCase();

  if (query.length === 0) {
    loadContent();
    return;
  }

  searchContent(query);
}

function searchContent(query) {
  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  const results = allContent.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase())
  );

  displaySearchResults(results, query);
}

function displaySearchResults(results, query) {
  const dynamicContainer = document.getElementById("dynamic-content-container");
  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  if (results.length === 0) {
    dynamicContainer.innerHTML = `
      <div class="no-results">
        <h3>Nenhum resultado encontrado para "${escapeHtml(query)}"</h3>
        <p>Tente pesquisar com outros termos.</p>
      </div>
    `;
    return;
  }

  renderSection(`Resultados para "${query}"`, results, dynamicContainer);
}

function filterContent(type) {
  let filteredContent = [];

  switch (type) {
    case "all":
      loadContent();
      return;
    case "anime":
      filteredContent = contentDatabase.animes;
      break;
    case "movie":
      filteredContent = contentDatabase.movies;
      break;
    case "series":
      filteredContent = contentDatabase.series;
      break;
  }

  const dynamicContainer = document.getElementById("dynamic-content-container");
  if (dynamicContainer) {
    dynamicContainer.innerHTML = "";
    renderSection(
      type.charAt(0).toUpperCase() + type.slice(1) + "s",
      filteredContent,
      dynamicContainer
    );
  }
}

// ===========================
// REPRODUÇÃO E INFORMAÇÕES
// ===========================

function playContent(id, type) {
  console.log(`▶️ Reproduzindo: ID ${id}, Tipo: ${type}`);

  const item = findContentById(id, type);
  if (!item) {
    showErrorMessage("Conteúdo não encontrado.");
    return;
  }

  // Atualizar histórico
  updateWatchHistory(id, type, 0);

  // Simular reprodução (você pode integrar um player real aqui)
  showPlayer(item);
}

function showPlayer(item) {
  const playerHTML = `
    <div class="video-player-overlay" onclick="closePlayer(event)">
      <div class="video-player-container" onclick="event.stopPropagation()">
        <div class="player-header">
          <h3>${escapeHtml(item.title)}</h3>
          <button onclick="closePlayer()" class="btn-close">✕</button>
        </div>
        <div class="player-content">
          <div class="player-placeholder">
            <p>▶️ Player de Vídeo</p>
            <p>${escapeHtml(item.title)}</p>
          </div>
        </div>
        <div class="player-controls">
          <button class="btn-control">⏮️</button>
          <button class="btn-control">⏯️</button>
          <button class="btn-control">⏭️</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", playerHTML);
}

function closePlayer(event) {
  if (event) event.stopPropagation();
  const overlay = document.querySelector(".video-player-overlay");
  if (overlay) overlay.remove();
}

function showInfo(id, type) {
  const item = findContentById(id, type);
  if (!item) return;

  const infoHTML = `
    <div class="info-modal-overlay" onclick="closeInfoModal(event)">
      <div class="info-modal" onclick="event.stopPropagation()">
        <button onclick="closeInfoModal()" class="btn-close">✕</button>
        <div class="info-content">
          <img src="${item.image}" alt="${escapeHtml(item.title)}">
          <div class="info-details">
            <h2>${escapeHtml(item.title)}</h2>
            <div class="info-meta">
              <span>⭐ ${item.rating}</span>
              <span>${item.year}</span>
              ${item.episodes ? `<span>${item.episodes} episódios</span>` : ""}
            </div>
            <p>${item.description || "Descrição não disponível."}</p>
            <div class="info-actions">
              <button onclick="playContent(${
                item.id
              }, '${type}')" class="btn-play">
                ▶️ Assistir Agora
              </button>
              <button onclick="addToFavorites(${
                item.id
              }, '${type}')" class="btn-favorite">
                ❤️ Favoritar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", infoHTML);
}

function closeInfoModal(event) {
  if (event) event.stopPropagation();
  const modal = document.querySelector(".info-modal-overlay");
  if (modal) modal.remove();
}

// ===========================
// FAVORITOS
// ===========================

function addToFavorites(id, type) {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const key = `${type}-${id}`;

  if (favorites.includes(key)) {
    showMessage("Já está nos favoritos!");
    return;
  }

  favorites.push(key);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  showMessage("Adicionado aos favoritos! ❤️");
}

// ===========================
// DADOS MOCK
// ===========================

function getMockData(type) {
  const mockData = {
    anime: [
      {
        id: 1,
        type: "anime",
        title: "One Piece",
        image: "https://via.placeholder.com/300x450?text=One+Piece",
        rating: 9.5,
        year: 2023,
        episodes: 1000,
        new: true,
        hd: true,
        description: "As aventuras de Luffy e sua tripulação.",
      },
      {
        id: 2,
        type: "anime",
        title: "Naruto",
        image: "https://via.placeholder.com/300x450?text=Naruto",
        rating: 9.2,
        year: 2023,
        episodes: 720,
        hd: true,
        description: "A jornada de um ninja que sonha em ser Hokage.",
      },
      {
        id: 3,
        type: "anime",
        title: "Attack on Titan",
        image: "https://via.placeholder.com/300x450?text=AOT",
        rating: 9.8,
        year: 2023,
        episodes: 87,
        new: true,
        hd: true,
        description: "Humanidade luta contra titãs gigantes.",
      },
    ],
    movie: [],
    series: [],
  };

  return mockData[type] || [];
}

// ===========================
// UTILITÁRIOS
// ===========================

function findContentById(id, type) {
  let content = [];

  switch (type) {
    case "anime":
      content = contentDatabase.animes;
      break;
    case "movie":
      content = contentDatabase.movies;
      break;
    case "series":
      content = contentDatabase.series;
      break;
  }

  return content.find((item) => item.id === id);
}

function generateSectionId(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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

function showLoadingState() {
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.style.display = "flex";
}

function hideLoadingState() {
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.style.display = "none";
}

function showMessage(message) {
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function showErrorMessage(message) {
  console.error("❌", message);
  showMessage(message);
}

function viewAllContent(sectionId) {
  console.log(`Ver todos: ${sectionId}`);
  // Implementar navegação para página completa
}

function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("currentSubscription");
  window.location.href = "index.html";
}

// ===========================
// EXPOSIÇÃO GLOBAL
// ===========================

window.playContent = playContent;
window.showInfo = showInfo;
window.searchContent = searchContent;
window.filterContent = filterContent;
window.addToFavorites = addToFavorites;
window.logout = logout;
window.closePlayer = closePlayer;
window.closeInfoModal = closeInfoModal;
window.viewAllContent = viewAllContent;

// ===========================
// INICIALIZAÇÃO AUTOMÁTICA
// ===========================

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

console.log("✅ content-streaming.js carregado e otimizado!");
