// content-streaming.js
// VERSÃO CORRIGIDA - PROBLEMA DO LOADING INFINITO RESOLVIDO

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
// INICIALIZAÇÃO - CORRIGIDO
// ===========================

async function init() {
  console.log("🚀 Iniciando aplicação...");

  try {
    setupEventListeners();
    loadWatchHistory();

    // AGUARDAR API CARREGAR
    console.log("⏳ Aguardando API...");
    await waitForAPI();
    console.log("✅ API disponível!");

    await verifyAccessAndLoadContent();
  } catch (error) {
    console.error("❌ Erro na inicialização:", error);
    hideLoadingState();
    showErrorMessage("Erro ao inicializar aplicação");
  }
}

function setupEventListeners() {
  console.log("🔧 Configurando event listeners...");

  // Busca
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }

  // Filtros
  const filterButtons = document.querySelectorAll(".nav-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;

      if (filter === "favorites") {
        showFavorites();
      } else {
        filterContent(filter);
      }
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

// ===========================
// AGUARDAR API - CRÍTICO
// ===========================

function waitForAPI() {
  return new Promise((resolve, reject) => {
    if (window.AnimeAPI) {
      console.log("✅ API já disponível");
      resolve();
      return;
    }

    console.log("⏳ Aguardando API carregar...");
    let attempts = 0;
    const maxAttempts = 100; // 10 segundos

    const checkInterval = setInterval(() => {
      attempts++;

      if (window.AnimeAPI) {
        clearInterval(checkInterval);
        console.log(`✅ API carregada após ${attempts * 100}ms`);
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error("❌ Timeout aguardando API");
        reject(new Error("API não carregou a tempo"));
      }
    }, 100);
  });
}

// ===========================
// CONTROLE DE ACESSO
// ===========================

async function verifyAccessAndLoadContent() {
  console.log("🔐 Verificando acesso...");

  const savedUser = localStorage.getItem("currentUser");
  const savedSubscription = localStorage.getItem("currentSubscription");

  console.log("👤 User:", savedUser);
  console.log("💎 Subscription:", savedSubscription);

  if (!savedUser || !savedSubscription) {
    console.log("❌ Sem dados de usuário/assinatura");
    showAccessDenied();
    return;
  }

  try {
    currentUser = JSON.parse(savedUser);
    currentSubscription =
      savedSubscription === "premium"
        ? "premium"
        : JSON.parse(savedSubscription);

    // Atualizar email do usuário
    const userEmail = document.getElementById("user-email");
    if (userEmail && currentUser.email) {
      userEmail.textContent = currentUser.email;
    }

    // Verificar se é premium
    const isPremium =
      currentSubscription === "premium" ||
      (typeof currentSubscription === "object" &&
        currentSubscription.status === "active");

    if (isPremium) {
      console.log("✅ Acesso premium confirmado");
      showPremiumContent();
      await loadContent();
    } else {
      console.log("❌ Não é premium");
      showAccessDenied();
    }
  } catch (error) {
    console.error("❌ Erro ao verificar acesso:", error);
    showAccessDenied();
  }
}

function showAccessDenied() {
  hideLoadingState();
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.innerHTML = `
      <div class="access-denied" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h2 style="font-size: 48px; margin-bottom: 20px;">🔒</h2>
        <h2>Acesso Negado</h2>
        <p style="max-width: 500px; text-align: center; margin: 20px 0;">Você precisa de uma assinatura Premium ativa para acessar este conteúdo exclusivo.</p>
        <button onclick="window.location.href='index.html'" class="btn-primary" style="margin-top: 20px; padding: 15px 40px; font-size: 18px;">
          🚀 Fazer Upgrade Agora
        </button>
      </div>
    `;
  }
}

function showPremiumContent() {
  const mainContent = document.getElementById("main-content");
  if (mainContent) {
    mainContent.style.display = "block";
  }
}

// ===========================
// CARREGAMENTO DE CONTEÚDO
// ===========================

async function loadContent() {
  console.log("📦 Iniciando loadContent...");
  showLoadingState();

  try {
    if (USE_API && window.AnimeAPI) {
      console.log("🌐 Usando API...");
      await loadContentFromAPI();
    } else {
      console.log("💾 Usando dados mock...");
      loadContentFromMock();
    }

    loadContinueWatching();
    hideLoadingState();
    console.log("✅ Conteúdo carregado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao carregar conteúdo:", error);
    handleLoadError(error);
  }
}

async function loadContentFromAPI() {
  console.log("📡 Carregando da API...");

  try {
    const data = await window.AnimeAPI.loadContentForHomepage();
    console.log("📦 Dados recebidos da API:", data);

    if (!data) {
      throw new Error("Nenhum dado retornado da API");
    }

    const sections = [
      {
        title: "⭐ Animes em Destaque",
        data: data.spotlightAnimes,
        id: "spotlight",
      },
      {
        title: "🔥 Animes em Tendência",
        data: data.trendingAnimes,
        id: "trending",
      },
      {
        title: "📺 Animes Populares",
        data: data.mostPopularAnimes,
        id: "popular",
      },
      {
        title: "❤️ Mais Favoritados",
        data: data.mostFavoriteAnimes,
        id: "favorites",
      },
      { title: "🏆 Top 10 Animes", data: data.top10Animes, id: "top10" },
      { title: "📡 No Ar Agora", data: data.topAiringAnimes, id: "airing" },
      {
        title: "🆕 Últimos Episódios",
        data: data.latestEpisodeAnimes,
        id: "latest",
      },
      {
        title: "✅ Recém-Completados",
        data: data.latestCompletedAnimes,
        id: "completed",
      },
      {
        title: "🔜 Próximos Lançamentos",
        data: data.topUpcomingAnimes,
        id: "upcoming",
      },
    ];

    const dynamicContainer = document.getElementById(
      "dynamic-content-container"
    );
    if (!dynamicContainer) {
      throw new Error("Container dinâmico não encontrado");
    }

    dynamicContainer.innerHTML = "";
    let renderedSections = 0;

    sections.forEach(({ title, data, id }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`✅ Renderizando: ${title} (${data.length} itens)`);
        renderSection(title, data, dynamicContainer, id);
        renderedSections++;

        // Armazenar trending para busca
        if (id === "trending") {
          contentDatabase.animes = data;
        }
      } else {
        console.warn(`⚠️ Sem dados para: ${title}`);
      }
    });

    if (renderedSections === 0) {
      throw new Error("Nenhuma seção com dados válidos");
    }

    // Esconder fallback
    const fallbackSection = document.getElementById("animes-grid-section");
    if (fallbackSection) {
      fallbackSection.style.display = "none";
    }

    console.log(`✅ ${renderedSections} seções renderizadas!`);
  } catch (error) {
    console.error("❌ Erro em loadContentFromAPI:", error);
    throw error;
  }
}

function loadContentFromMock() {
  console.log("💾 Carregando dados mock...");

  const mockAnimes = getMockData();
  contentDatabase.animes = mockAnimes;

  renderContent("animes-grid", mockAnimes);

  const animesSection = document.getElementById("animes-grid-section");
  if (animesSection) {
    animesSection.style.display = "block";
  }
}

function handleLoadError(error) {
  console.error("❌ Tratando erro de carregamento:", error);
  hideLoadingState();
  showErrorMessage("Erro ao carregar conteúdo da API. Usando dados locais.");
  loadContentFromMock();
  loadContinueWatching();
}

// ===========================
// RENDERIZAÇÃO
// ===========================

function renderSection(title, items, container, sectionId) {
  const section = document.createElement("section");
  section.className = "content-section";
  section.id = `${sectionId}-section`;

  section.innerHTML = `
    <div class="section-header">
      <h3>${title}</h3>
      <button class="btn-see-all" onclick="viewAllSection('${sectionId}')">
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
  const id = item.id || "";
  const title = item.name || item.title || "Sem título";
  const image =
    item.poster ||
    item.image ||
    "https://via.placeholder.com/300x450?text=No+Image";
  const rating = item.rating || "N/A";
  const episodes = item.episodes?.sub || item.episodes || "";
  const type = item.type || "anime";

  return `
    <div class="content-card" data-id="${escapeHtml(id)}" data-type="${type}">
      <div class="card-image">
        <img src="${image}" alt="${escapeHtml(title)}" loading="lazy" 
             onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
      </div>
      
      ${
        episodes
          ? `<span class="card-badge badge-new">${episodes} EPs</span>`
          : ""
      }
      
      <div class="card-overlay">
        <div class="overlay-details">
          <h4 class="card-title">${escapeHtml(title)}</h4>
          <div class="card-meta">
            <span class="card-rating">⭐ ${rating}</span>
            ${episodes ? `<span>${episodes} eps</span>` : ""}
          </div>
        </div>

        <div class="card-actions">
          <button onclick="playContent('${escapeHtml(
            id
          )}', '${type}')" class="btn-play">
            ▶️ Assistir
          </button>
          <button onclick="showInfo('${escapeHtml(
            id
          )}', '${type}')" class="btn-info">
            ℹ️ Info
          </button>
          <button onclick="addToFavorites('${escapeHtml(
            id
          )}', '${type}')" class="btn-favorite">
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
  return `
    <div class="content-card" data-id="${escapeHtml(item.id)}" data-type="${
    item.type
  }">
      <div class="card-image">
        <img src="${item.image}" alt="${escapeHtml(item.title)}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${item.progress}%;"></div>
      </div>
      
      <div class="card-overlay">
        <div class="overlay-details">
          <h4 class="card-title">${escapeHtml(item.title)}</h4>
          <div class="card-meta">
            <span>⏱️ ${item.progress}% concluído</span>
          </div>
        </div>
        <div class="card-actions">
          <button onclick="playContent('${escapeHtml(item.id)}', '${
    item.type
  }')" class="btn-play">
            ▶️ Continuar
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===========================
// BUSCA E FILTROS
// ===========================

function handleSearch(event) {
  const query = event.target.value.trim();

  if (query.length === 0) {
    loadContent();
    return;
  }

  if (query.length < 2) return;

  searchContent(query);
}

async function searchContent(query) {
  showLoadingState();

  try {
    if (window.AnimeAPI) {
      const results = await window.AnimeAPI.searchAnimes(query);
      displaySearchResults(results.animes || [], query);
    } else {
      const results = contentDatabase.animes.filter((item) =>
        (item.name || item.title || "")
          .toLowerCase()
          .includes(query.toLowerCase())
      );
      displaySearchResults(results, query);
    }
  } catch (error) {
    console.error("Erro na busca:", error);
    showErrorMessage("Erro ao buscar. Tente novamente.");
  } finally {
    hideLoadingState();
  }
}

function displaySearchResults(results, query) {
  const dynamicContainer = document.getElementById("dynamic-content-container");
  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  if (results.length === 0) {
    dynamicContainer.innerHTML = `
      <div class="no-results">
        <h3>😕 Nenhum resultado encontrado</h3>
        <p>Não encontramos nada para "${escapeHtml(query)}"</p>
        <p>Tente pesquisar com outros termos.</p>
      </div>
    `;
    return;
  }

  renderSection(
    `🔍 Resultados para "${query}"`,
    results,
    dynamicContainer,
    "search-results"
  );
}

function filterContent(type) {
  if (type === "all") {
    loadContent();
    return;
  }

  const dynamicContainer = document.getElementById("dynamic-content-container");
  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  if (type === "trending") {
    renderSection(
      "🔥 Animes em Tendência",
      contentDatabase.animes,
      dynamicContainer,
      "filtered"
    );
  } else if (type === "anime") {
    renderSection(
      "📺 Todos os Animes",
      contentDatabase.animes,
      dynamicContainer,
      "filtered"
    );
  }
}

function showFavorites() {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  if (favorites.length === 0) {
    const dynamicContainer = document.getElementById(
      "dynamic-content-container"
    );
    dynamicContainer.innerHTML = `
      <div class="no-results">
        <h3>💔 Nenhum favorito ainda</h3>
        <p>Adicione seus animes favoritos clicando no botão ❤️</p>
      </div>
    `;
    return;
  }

  showMessage("Funcionalidade em desenvolvimento! 🚧");
}

// ===========================
// REPRODUÇÃO E INFORMAÇÕES
// ===========================

function playContent(id, type) {
  console.log(`▶️ Reproduzindo: ${id}`);
  window.location.href = `player.html?id=${encodeURIComponent(id)}&ep=1`;
}

async function showInfo(id, type) {
  console.log(`ℹ️ Carregando info de: ${id}`);
  showLoadingState();

  try {
    if (!window.AnimeAPI) {
      throw new Error("API não disponível");
    }

    console.log(`📡 Buscando anime: ${id}`);
    const animeData = await window.AnimeAPI.getAnimeInfo(id);
    console.log("📦 Dados recebidos:", animeData);

    const anime = animeData.anime?.info || animeData;

    if (!anime) {
      throw new Error("Dados do anime não encontrados");
    }

    const infoHTML = `
      <div class="info-modal-overlay" onclick="closeInfoModal(event)">
        <div class="info-modal" onclick="event.stopPropagation()">
          <button onclick="closeInfoModal()" class="btn-close" style="position: absolute; top: 20px; right: 20px; z-index: 10;">✕</button>
          <div class="info-content">
            <img src="${anime.poster || "https://via.placeholder.com/300x450"}" 
                 alt="${escapeHtml(anime.name || anime.title)}"
                 onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="info-details">
              <h2>${escapeHtml(anime.name || anime.title || "Sem título")}</h2>
              ${
                anime.jname
                  ? `<p style="color: #9ca3af; margin-bottom: 15px;">${escapeHtml(
                      anime.jname
                    )}</p>`
                  : ""
              }
              <div class="info-meta">
                <span>⭐ ${anime.rating || "N/A"}</span>
                ${
                  anime.stats?.episodes?.sub
                    ? `<span>📺 ${anime.stats.episodes.sub} eps</span>`
                    : ""
                }
                ${
                  anime.stats?.type ? `<span>📅 ${anime.stats.type}</span>` : ""
                }
                ${
                  anime.stats?.status
                    ? `<span>${anime.stats.status}</span>`
                    : ""
                }
              </div>
              <p style="margin: 20px 0; line-height: 1.6;">${escapeHtml(
                anime.description || "Descrição não disponível."
              )}</p>
              <div class="info-actions">
                <button onclick="playContent('${escapeHtml(
                  id
                )}', '${type}'); closeInfoModal();" class="btn-play">
                  ▶️ Assistir Agora
                </button>
                <button onclick="addToFavorites('${escapeHtml(
                  id
                )}', '${type}')" class="btn-secondary">
                  ❤️ Favoritar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", infoHTML);
    console.log("✅ Modal de info exibido");
  } catch (error) {
    console.error("❌ Erro ao carregar informações:", error);
    showErrorMessage(`Erro: ${error.message}`);
  } finally {
    hideLoadingState();
  }
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
    showMessage("❤️ Já está nos favoritos!");
    return;
  }

  favorites.push(key);
  localStorage.setItem("favorites", JSON.stringify(favorites));
  showMessage("✅ Adicionado aos favoritos!");
}

// ===========================
// UTILITÁRIOS
// ===========================

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function showLoadingState() {
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.display = "flex";
    console.log("🔄 Loading exibido");
  }
}

function hideLoadingState() {
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.display = "none";
    console.log("✅ Loading ocultado");
  }
}

function showMessage(message) {
  const container = document.getElementById("toast-container") || document.body;
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  container.appendChild(toast);

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

function viewAllSection(sectionId) {
  console.log(`Ver todos: ${sectionId}`);
  showMessage("Funcionalidade em desenvolvimento! 🚧");
}

function logout() {
  if (confirm("Deseja realmente sair?")) {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("currentSubscription");
    window.location.href = "index.html";
  }
}

// ===========================
// DADOS MOCK (FALLBACK)
// ===========================

function getMockData() {
  return [
    {
      id: "one-piece-100",
      name: "One Piece",
      poster: "https://via.placeholder.com/300x450?text=One+Piece",
      rating: 9.5,
      episodes: { sub: 1000 },
      type: "anime",
    },
    {
      id: "naruto-shippuden",
      name: "Naruto Shippuden",
      poster: "https://via.placeholder.com/300x450?text=Naruto",
      rating: 9.2,
      episodes: { sub: 500 },
      type: "anime",
    },
    {
      id: "attack-on-titan-112",
      name: "Attack on Titan",
      poster: "https://via.placeholder.com/300x450?text=AOT",
      rating: 9.8,
      episodes: { sub: 87 },
      type: "anime",
    },
  ];
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
window.closeInfoModal = closeInfoModal;
window.viewAllSection = viewAllSection;
window.showFavorites = showFavorites;

// ===========================
// INICIALIZAÇÃO AUTOMÁTICA - CORRIGIDO
// ===========================

// Remover a inicialização automática antiga
// Adicionar nova lógica

document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM Carregado");

  // Pequeno delay para garantir que scripts carregaram
  setTimeout(() => {
    console.log("🎯 Chamando init()...");
    init();
  }, 100);
});

console.log("✅ content-streaming.js carregado!");
