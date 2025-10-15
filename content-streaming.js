// content-streaming.js - VERSÃO COMPLETA COM SIDEBAR
let currentUser = null;
let favorites = [];
let currentPage = 1;
let currentFilter = "home";
let currentGenre = null;
let isLoading = false;
let hasNextPage = true;
let allAnimes = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  console.log("🚀 Iniciando YayaAnimes...");
  try {
    setupEventListeners();
    loadFavorites();
    await waitForAPI();
    await verifyAccessAndLoadContent();
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao inicializar");
  }
}

function setupEventListeners() {
  // Busca
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 500));
  }

  // Botões da sidebar
  document.querySelectorAll(".sidebar-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".genre-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const action = btn.dataset.action;
      currentFilter = action;
      currentGenre = null;
      currentPage = 1;
      allAnimes = [];
      hasNextPage = true;

      if (action === "favorites") {
        showFavorites();
      } else if (action === "home") {
        loadHomePage();
      } else {
        loadAnimesByCategory(action, 1);
      }
    });
  });

  // Botões de gênero
  document.querySelectorAll(".genre-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".sidebar-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelectorAll(".genre-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const genre = btn.dataset.genre;
      currentGenre = genre;
      currentFilter = null;
      currentPage = 1;
      allAnimes = [];
      hasNextPage = true;

      loadAnimesByGenre(genre, 1);
    });
  });

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Scroll infinito
  window.addEventListener("scroll", () => {
    if (
      isLoading ||
      !hasNextPage ||
      currentFilter === "favorites" ||
      currentFilter === "home"
    )
      return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= pageHeight - 300) {
      loadMoreAnimes();
    }
  });
}

function waitForAPI() {
  return new Promise((resolve, reject) => {
    if (window.AnimeAPI) {
      console.log("✅ AnimeAPI encontrada");
      resolve();
      return;
    }
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.AnimeAPI) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= 50) {
        clearInterval(checkInterval);
        reject(new Error("API não carregou"));
      }
    }, 100);
  });
}

async function verifyAccessAndLoadContent() {
  console.log("🔐 Verificando acesso...");
  try {
    const {
      data: { user },
      error,
    } = await window.supabase.auth.getUser();

    if (error || !user) {
      showAccessDenied();
      return;
    }

    currentUser = { id: user.id, email: user.email };
    const userEmail = document.getElementById("user-email");
    if (userEmail) userEmail.textContent = user.email;

    const { data: subscription } = await window.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription || new Date(subscription.expires_at) < new Date()) {
      showAccessDenied();
      return;
    }

    console.log("✅ Assinatura válida");
    await loadHomePage();
  } catch (error) {
    console.error("❌ Erro:", error);
    showAccessDenied();
  }
}

// HOME - 50 CARDS
async function loadHomePage() {
  console.log("📺 Carregando home...");
  showLoadingState();
  currentFilter = "home";

  try {
    const response = await window.AnimeAPI.getHomePage();
    let animes = [];

    if (response.data) {
      // Agrega TODAS as seções até ter 50 animes únicos
      const sections = [
        "trending",
        "spotlightAnimes",
        "latestEpisodeAnimes",
        "topUpcomingAnimes",
        "topAiringAnimes",
        "mostPopularAnimes",
        "latestCompletedAnimes",
      ];

      const seen = new Set();

      for (const section of sections) {
        if (response.data[section] && Array.isArray(response.data[section])) {
          response.data[section].forEach((anime) => {
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
      await loadAnimesByCategory("most-popular", 1);
    } else {
      allAnimes = animes;
      hasNextPage = false;
      displayContent(animes);
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao carregar");
  }
}

// CATEGORIA
async function loadAnimesByCategory(category, page = 1) {
  console.log(`📺 ${category} - Página ${page}`);

  if (page === 1) {
    showLoadingState();
  } else {
    showLoadMoreIndicator(true);
  }

  isLoading = true;

  try {
    const response = await window.AnimeAPI.getAnimesByCategory(category, page);
    const newAnimes = response.data.results || response.data.animes || [];

    console.log(`✅ ${newAnimes.length} animes`);

    allAnimes = page === 1 ? newAnimes : [...allAnimes, ...newAnimes];
    hasNextPage = response.data.hasNextPage || false;

    if (page === 1) {
      displayContent(allAnimes);
    } else {
      appendContent(newAnimes);
    }

    showLoadMoreIndicator(false);
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao carregar");
    showLoadMoreIndicator(false);
  } finally {
    isLoading = false;
  }
}

// GÊNERO
async function loadAnimesByGenre(genre, page = 1) {
  console.log(`🎭 ${genre} - Página ${page}`);

  if (page === 1) {
    showLoadingState();
  } else {
    showLoadMoreIndicator(true);
  }

  isLoading = true;

  try {
    const response = await window.AnimeAPI.getAnimesByGenre(genre, page);
    const newAnimes = response.data.results || response.data.animes || [];

    console.log(`✅ ${newAnimes.length} animes`);

    allAnimes = page === 1 ? newAnimes : [...allAnimes, ...newAnimes];
    hasNextPage = response.data.hasNextPage || false;

    if (page === 1) {
      displayContent(allAnimes);
    } else {
      appendContent(newAnimes);
    }

    showLoadMoreIndicator(false);
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao carregar");
    showLoadMoreIndicator(false);
  } finally {
    isLoading = false;
  }
}

// SCROLL INFINITO
async function loadMoreAnimes() {
  if (isLoading || !hasNextPage) return;

  currentPage++;
  console.log("📜 Página", currentPage);

  if (currentGenre) {
    await loadAnimesByGenre(currentGenre, currentPage);
  } else if (
    currentFilter &&
    currentFilter !== "home" &&
    currentFilter !== "favorites"
  ) {
    await loadAnimesByCategory(currentFilter, currentPage);
  }
}

// BUSCA
async function handleSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    currentPage = 1;
    allAnimes = [];
    currentFilter = "home";
    currentGenre = null;
    loadHomePage();
    return;
  }

  console.log("🔍", query);
  showLoadingState();

  try {
    const response = await window.AnimeAPI.search(query, 1);
    const results = response.data.results || response.data.animes || [];

    if (results.length === 0) {
      showEmptyState("Nenhum anime encontrado");
    } else {
      allAnimes = results;
      currentFilter = null;
      currentGenre = null;
      hasNextPage = false;
      displayContent(results);
    }
  } catch (error) {
    console.error("❌", error);
    showError("Erro na busca");
  }
}

// EXIBIR
function displayContent(items) {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `<div class="content-grid" id="content-grid"></div>`;
  const grid = document.getElementById("content-grid");
  items.forEach((item) => grid.appendChild(createContentCard(item)));
}

function appendContent(items) {
  const grid = document.getElementById("content-grid");
  if (!grid) return;
  items.forEach((item) => grid.appendChild(createContentCard(item)));
}

// CARD
function createContentCard(anime) {
  const card = document.createElement("div");
  card.className = "content-card";

  const animeId = anime.id || anime.mal_id;
  const title = anime.name || anime.title || "Anime";
  const poster = anime.poster || anime.image || "/placeholder.jpg";
  const rating = anime.rating || "N/A";
  const episodes = anime.episodes?.sub || anime.episodes || "?";
  const type = anime.type || "TV";
  const isFavorite = favorites.some((f) => f.id === animeId);

  card.innerHTML = `
        <div class="card-image">
            <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='/placeholder.jpg'">
            <div class="type-badge">${type}</div>
            <div class="card-overlay">
                <button class="play-btn" onclick="openAnimeDetails('${animeId}', '${encodeURIComponent(
    title
  )}')">
                    ▶ Assistir
                </button>
                <button class="fav-btn ${isFavorite ? "active" : ""}" 
                        onclick="event.stopPropagation(); toggleFavorite('${animeId}', '${title.replace(
    /'/g,
    "\\'"
  )}', '${poster}')">
                    ${isFavorite ? "❤️" : "🤍"}
                </button>
            </div>
        </div>
        <div class="card-info">
            <h3 class="card-title">${title}</h3>
            <div class="card-meta">
                <span>${rating} ⭐</span>
                <span>${episodes} eps</span>
            </div>
        </div>
    `;
  return card;
}

// GLOBAIS
window.openAnimeDetails = function (animeId, animeTitle) {
  window.location.href = `anime.html?id=${animeId}&title=${animeTitle}`;
};

window.toggleFavorite = function (id, title, image) {
  const index = favorites.findIndex((f) => f.id === id);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push({ id, title, image });
  }
  saveFavorites();

  document.querySelectorAll(`.fav-btn`).forEach((btn) => {
    const parentCard = btn.closest(".content-card");
    if (parentCard) {
      const cardTitle = parentCard.querySelector(".card-title")?.textContent;
      if (cardTitle === title) {
        btn.textContent = index > -1 ? "🤍" : "❤️";
        btn.classList.toggle("active");
      }
    }
  });
};

function loadFavorites() {
  const saved = localStorage.getItem("favorites");
  if (saved) favorites = JSON.parse(saved);
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function showFavorites() {
  hasNextPage = false;
  if (favorites.length === 0) {
    showEmptyState("Nenhum favorito");
    return;
  }
  displayContent(favorites);
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function showLoadingState() {
  document.getElementById("main-content").innerHTML = `
        <div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>
    `;
}

function showLoadMoreIndicator(show) {
  const indicator = document.getElementById("load-more-indicator");
  if (indicator) indicator.style.display = show ? "block" : "none";
}

function showEmptyState(message) {
  document.getElementById("main-content").innerHTML = `
        <div class="loading-state"><p style="font-size:48px;">📭</p><p>${message}</p></div>
    `;
}

function showError(message) {
  document.getElementById("main-content").innerHTML = `
        <div class="loading-state"><p style="font-size:48px;">❌</p><p>${message}</p></div>
    `;
}

function showAccessDenied() {
  document.getElementById("main-content").innerHTML = `
        <div class="loading-state">
            <h2 style="color:#ff6b6b;">🔒 Acesso Restrito</h2>
            <p>Assinatura necessária</p>
            <button onclick="window.location.href='index.html'" style="margin-top:20px;padding:12px 30px;background:#ff6b6b;border:none;border-radius:10px;color:white;font-weight:700;cursor:pointer;">Voltar</button>
        </div>
    `;
}

function logout() {
  window.supabase.auth.signOut();
  window.location.href = "index.html";
}
