// content.js - MELHORIAS OPCIONAIS
// Adicione estas funcionalidades ao seu content.js existente

// ===========================
// FILTROS POR CATEGORIA
// ===========================

async function loadByCategory(category) {
  showLoadingState();

  try {
    const data = await window.AnimeAPI.getAnimeByCategory(category, 1);

    const categoryNames = {
      tv: "📺 Séries de TV",
      movie: "🎬 Filmes",
      ova: "🎯 OVAs",
      ona: "🌐 ONAs",
      special: "⭐ Especiais",
      "most-popular": "🔥 Mais Populares",
      "top-airing": "📡 No Ar Agora",
    };

    const dynamicContainer = document.getElementById(
      "dynamic-content-container"
    );
    if (!dynamicContainer) return;

    dynamicContainer.innerHTML = "";
    renderSection(
      categoryNames[category] || category,
      data.data.animes,
      dynamicContainer,
      category
    );

    hideLoadingState();
  } catch (error) {
    console.error("Erro ao carregar categoria:", error);
    showErrorMessage("Erro ao carregar categoria");
    hideLoadingState();
  }
}

// ===========================
// PAGINAÇÃO AVANÇADA
// ===========================

let currentPage = 1;
let currentFilter = "all";

async function loadWithPagination(filter, page = 1) {
  showLoadingState();
  currentPage = page;
  currentFilter = filter;

  try {
    let data;

    if (filter === "all") {
      data = await window.AnimeAPI.loadContentForHomepage();
    } else {
      data = await window.AnimeAPI.getAnimeByCategory(filter, page);
    }

    renderWithPagination(data, filter);
    hideLoadingState();
  } catch (error) {
    console.error("Erro ao carregar página:", error);
    showErrorMessage("Erro ao carregar página");
    hideLoadingState();
  }
}

function renderWithPagination(data, filter) {
  const dynamicContainer = document.getElementById("dynamic-content-container");
  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  // Renderizar conteúdo
  if (filter === "all") {
    // Renderizar homepage normal
    const adapted = data.data || data;
    renderSection(
      "🔥 Em Destaque",
      adapted.spotlightAnimes,
      dynamicContainer,
      "spotlight"
    );
  } else {
    // Renderizar categoria com paginação
    const animes = data.data?.animes || [];
    renderSection(`Página ${currentPage}`, animes, dynamicContainer, filter);

    // Adicionar controles de paginação
    if (data.data?.totalPages > 1) {
      addPaginationControls(data.data);
    }
  }
}

function addPaginationControls(pageData) {
  const dynamicContainer = document.getElementById("dynamic-content-container");

  const paginationHTML = `
    <div class="pagination-controls" style="display: flex; justify-content: center; gap: 10px; margin: 30px 0;">
      <button 
        onclick="loadWithPagination('${currentFilter}', ${currentPage - 1})"
        ${currentPage === 1 ? "disabled" : ""}
        style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;"
      >
        ← Anterior
      </button>
      
      <span style="padding: 10px 20px; background: rgba(102, 126, 234, 0.1); border-radius: 8px; display: flex; align-items: center;">
        Página ${currentPage} de ${pageData.totalPages}
      </span>
      
      <button 
        onclick="loadWithPagination('${currentFilter}', ${currentPage + 1})"
        ${!pageData.hasNextPage ? "disabled" : ""}
        style="padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;"
      >
        Próxima →
      </button>
    </div>
  `;

  dynamicContainer.insertAdjacentHTML("beforeend", paginationHTML);
}

// ===========================
// BUSCA AVANÇADA COM FILTROS
// ===========================

async function advancedSearch(query, filters = {}) {
  showLoadingState();

  try {
    const page = filters.page || 1;
    const results = await window.AnimeAPI.searchAnimes(query, page);

    displaySearchResults(results.data.animes || [], query, results.data);
    hideLoadingState();
  } catch (error) {
    console.error("Erro na busca avançada:", error);
    showErrorMessage("Erro ao buscar");
    hideLoadingState();
  }
}

// ===========================
// SISTEMA DE FAVORITOS MELHORADO
// ===========================

function addToFavoritesImproved(id, type) {
  const favorites = JSON.parse(localStorage.getItem("favorites_v2") || "[]");

  // Verificar se já existe
  const existingIndex = favorites.findIndex((fav) => fav.id === id);

  if (existingIndex !== -1) {
    showMessage("❤️ Já está nos favoritos!");
    return;
  }

  // Buscar informações completas do anime
  window.AnimeAPI.getAnimeInfo(id)
    .then((response) => {
      const anime = response.data.anime.info;

      const favorite = {
        id: anime.id,
        name: anime.name,
        title: anime.name,
        poster: anime.poster,
        image: anime.poster,
        rating: anime.rating,
        type: type,
        addedAt: new Date().toISOString(),
      };

      favorites.unshift(favorite);
      localStorage.setItem("favorites_v2", JSON.stringify(favorites));

      showMessage("✅ Adicionado aos favoritos!");
      updateFavoritesCounter();
    })
    .catch((error) => {
      console.error("Erro ao adicionar favorito:", error);
      showMessage("❌ Erro ao adicionar favorito");
    });
}

function removeFromFavorites(id) {
  const favorites = JSON.parse(localStorage.getItem("favorites_v2") || "[]");
  const filtered = favorites.filter((fav) => fav.id !== id);

  localStorage.setItem("favorites_v2", JSON.stringify(filtered));
  showMessage("🗑️ Removido dos favoritos");
  updateFavoritesCounter();

  // Recarregar se estiver na página de favoritos
  if (currentFilter === "favorites") {
    showFavoritesImproved();
  }
}

function showFavoritesImproved() {
  const favorites = JSON.parse(localStorage.getItem("favorites_v2") || "[]");
  const dynamicContainer = document.getElementById("dynamic-content-container");

  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  if (favorites.length === 0) {
    dynamicContainer.innerHTML = `
      <div class="no-results" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center;">
        <h2 style="font-size: 48px; margin-bottom: 20px;">💔</h2>
        <h3>Nenhum favorito ainda</h3>
        <p style="max-width: 500px; text-align: center; margin: 20px 0;">
          Adicione seus animes favoritos clicando no botão ❤️
        </p>
      </div>
    `;
    return;
  }

  renderSection(
    `❤️ Meus Favoritos (${favorites.length})`,
    favorites,
    dynamicContainer,
    "favorites"
  );

  currentFilter = "favorites";
}

function updateFavoritesCounter() {
  const favorites = JSON.parse(localStorage.getItem("favorites_v2") || "[]");
  const counter = document.getElementById("favorites-counter");

  if (counter) {
    counter.textContent = favorites.length;
    counter.style.display = favorites.length > 0 ? "inline-block" : "none";
  }
}

// ===========================
// HISTÓRICO DE VISUALIZAÇÃO MELHORADO
// ===========================

function getWatchHistoryStats() {
  const history = JSON.parse(localStorage.getItem("watch_history") || "[]");

  const stats = {
    totalAnimes: new Set(history.map((h) => h.animeId)).size,
    totalEpisodes: history.length,
    totalTime: history.reduce((acc, h) => acc + (h.currentTime || 0), 0),
    lastWatched: history[0] || null,
    mostWatched: null,
  };

  // Calcular anime mais assistido
  const animeCount = {};
  history.forEach((h) => {
    animeCount[h.animeId] = (animeCount[h.animeId] || 0) + 1;
  });

  const mostWatchedId = Object.keys(animeCount).reduce(
    (a, b) => (animeCount[a] > animeCount[b] ? a : b),
    null
  );

  stats.mostWatched = history.find((h) => h.animeId === mostWatchedId);

  return stats;
}

function showWatchStats() {
  const stats = getWatchHistoryStats();
  const hours = Math.floor(stats.totalTime / 3600);
  const minutes = Math.floor((stats.totalTime % 3600) / 60);

  const modalHTML = `
    <div class="stats-modal-overlay" onclick="closeStatsModal(event)">
      <div class="stats-modal" onclick="event.stopPropagation()">
        <button onclick="closeStatsModal()" class="btn-close">✕</button>
        
        <h2 style="margin-bottom: 30px; text-align: center;">📊 Suas Estatísticas</h2>
        
        <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
          <div class="stat-box" style="background: rgba(102, 126, 234, 0.1); padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">📺</div>
            <div style="font-size: 32px; font-weight: 700; color: #667eea;">${
              stats.totalAnimes
            }</div>
            <div style="color: #9ca3af;">Animes Assistidos</div>
          </div>
          
          <div class="stat-box" style="background: rgba(102, 126, 234, 0.1); padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">🎬</div>
            <div style="font-size: 32px; font-weight: 700; color: #667eea;">${
              stats.totalEpisodes
            }</div>
            <div style="color: #9ca3af;">Episódios</div>
          </div>
          
          <div class="stat-box" style="background: rgba(102, 126, 234, 0.1); padding: 20px; border-radius: 12px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 10px;">⏱️</div>
            <div style="font-size: 32px; font-weight: 700; color: #667eea;">${hours}h ${minutes}m</div>
            <div style="color: #9ca3af;">Tempo Total</div>
          </div>
        </div>
        
        ${
          stats.mostWatched
            ? `
          <div style="background: rgba(102, 126, 234, 0.05); padding: 20px; border-radius: 12px;">
            <h3 style="margin-bottom: 15px;">🏆 Anime Mais Assistido</h3>
            <div style="display: flex; gap: 15px; align-items: center;">
              <img src="${stats.mostWatched.poster || stats.mostWatched.image}" 
                   alt="${stats.mostWatched.title}" 
                   style="width: 80px; height: 120px; border-radius: 8px; object-fit: cover;">
              <div>
                <h4 style="margin-bottom: 8px;">${stats.mostWatched.title}</h4>
                <p style="color: #9ca3af;">Último episódio: ${
                  stats.mostWatched.episode
                }</p>
              </div>
            </div>
          </div>
        `
            : ""
        }
        
        <button onclick="closeStatsModal()" class="btn-primary" style="width: 100%; margin-top: 20px; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
          Fechar
        </button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeStatsModal(event) {
  if (event) event.stopPropagation();
  const modal = document.querySelector(".stats-modal-overlay");
  if (modal) modal.remove();
}

// ===========================
// EXPOSIÇÃO GLOBAL
// ===========================

window.loadByCategory = loadByCategory;
window.loadWithPagination = loadWithPagination;
window.advancedSearch = advancedSearch;
window.addToFavoritesImproved = addToFavoritesImproved;
window.removeFromFavorites = removeFromFavorites;
window.showFavoritesImproved = showFavoritesImproved;
window.showWatchStats = showWatchStats;
window.closeStatsModal = closeStatsModal;

// ===========================
// INICIALIZAÇÃO
// ===========================

document.addEventListener("DOMContentLoaded", () => {
  updateFavoritesCounter();

  // Adicionar contador de favoritos ao header (se ainda não existir)
  const favBtn = document.querySelector('[data-filter="favorites"]');
  if (favBtn && !document.getElementById("favorites-counter")) {
    favBtn.innerHTML +=
      ' <span id="favorites-counter" style="background: #ef4444; padding: 2px 8px; border-radius: 12px; font-size: 12px; margin-left: 5px; display: none;">0</span>';
    updateFavoritesCounter();
  }
});

console.log("✅ Melhorias do content.js carregadas!");
