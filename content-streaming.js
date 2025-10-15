// content-streaming.js - SCROLL INFINITO + 50 CARDS POR PÁGINA
let currentUser = null;
let favorites = [];
let currentPage = 1;
let currentCategory = "trending"; // trending, tv, movie
let isLoading = false;
let hasNextPage = true;
let allAnimes = []; // Armazena todos os animes carregados

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
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 500));
  }

  const navButtons = document.querySelectorAll(".nav-btn");
  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      navButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;

      // Reset
      currentPage = 1;
      allAnimes = [];
      hasNextPage = true;

      if (filter === "favorites") {
        showFavorites();
      } else if (filter === "home") {
        currentCategory = "trending";
        loadHomePage();
      } else if (filter === "tv") {
        currentCategory = "tv";
        loadAnimesByCategory("tv");
      } else if (filter === "movie") {
        currentCategory = "movie";
        loadAnimesByCategory("movie");
      }
    });
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // SCROLL INFINITO
  window.addEventListener("scroll", () => {
    if (isLoading || !hasNextPage) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const pageHeight = document.documentElement.scrollHeight;

    // Quando estiver a 300px do final da página
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
      console.log(`⏳ Aguardando API... (tentativa ${attempts})`);
      if (window.AnimeAPI) {
        clearInterval(checkInterval);
        console.log("✅ AnimeAPI carregada!");
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
    console.log("✅ Usuário:", user.email);

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

    console.log("✅ Assinatura válida até:", subscription.expires_at);
    await loadHomePage();
  } catch (error) {
    console.error("❌ Erro:", error);
    showAccessDenied();
  }
}

// CARREGA HOME PAGE (TRENDING)
async function loadHomePage() {
  console.log("📺 Carregando home...");
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getHomePage();

    console.log("🔍 Resposta da API:", response);

    let animes = [];

    if (response.data) {
      const sections = [
        "trending",
        "spotlightAnimes",
        "latestEpisodeAnimes",
        "topUpcomingAnimes",
        "topAiringAnimes",
        "mostPopularAnimes",
        "mostFavoriteAnimes",
        "latestCompletedAnimes",
      ];

      for (const section of sections) {
        if (
          response.data[section] &&
          Array.isArray(response.data[section]) &&
          response.data[section].length > 0
        ) {
          animes = response.data[section].slice(0, 50); // PEGA 50 ANIMES
          console.log(`✅ Usando seção: ${section} (${animes.length} animes)`);
          break;
        }
      }
    }

    if (animes.length === 0) {
      console.log("⚠️ Home vazia, carregando categoria TV...");
      await loadAnimesByCategory("tv");
    } else {
      allAnimes = animes;
      displayContent(animes);
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao carregar");
  }
}

// CARREGA ANIMES POR CATEGORIA (COM PAGINAÇÃO)
async function loadAnimesByCategory(category = "tv", page = 1) {
  console.log(`📺 Carregando ${category} - Página ${page}`);

  if (page === 1) {
    showLoadingState();
  } else {
    showLoadMoreIndicator(true);
  }

  try {
    const response = await window.AnimeAPI.getAnimesByCategory(category, page);
    const newAnimes = response.data.results || [];

    console.log(`✅ ${newAnimes.length} animes carregados (página ${page})`);

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
  }
}

// CARREGA MAIS ANIMES (SCROLL INFINITO)
async function loadMoreAnimes() {
  if (isLoading || !hasNextPage || currentCategory === "trending") return;

  isLoading = true;
  currentPage++;

  console.log("📜 Carregando mais... Página", currentPage);

  await loadAnimesByCategory(currentCategory, currentPage);

  isLoading = false;
}

// BUSCA DE ANIMES
async function handleSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    currentPage = 1;
    allAnimes = [];
    loadHomePage();
    return;
  }

  console.log("🔍 Buscando:", query);
  showLoadingState();

  try {
    const response = await window.AnimeAPI.search(query, 1);
    const results = response.data.results || [];

    if (results.length === 0) {
      showEmptyState("Nenhum anime encontrado");
    } else {
      console.log("✅ Encontrados:", results.length);
      allAnimes = results;
      hasNextPage = false; // Desabilita scroll infinito na busca
      displayContent(results);
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro na busca");
  }
}

// EXIBE OS ANIMES NA TELA
function displayContent(items) {
  console.log("🎨 Exibindo", items.length, "cards");
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `<div class="content-grid" id="content-grid"></div>`;
  const grid = document.getElementById("content-grid");
  items.forEach((item) => {
    const card = createContentCard(item);
    grid.appendChild(card);
  });
}

// ADICIONA MAIS ANIMES NO GRID (SCROLL INFINITO)
function appendContent(items) {
  console.log("➕ Adicionando", items.length, "cards");
  const grid = document.getElementById("content-grid");
  if (!grid) return;

  items.forEach((item) => {
    const card = createContentCard(item);
    grid.appendChild(card);
  });
}

// CRIA O CARD DO ANIME
function createContentCard(anime) {
  const card = document.createElement("div");
  card.className = "content-card";

  const animeId = anime.id || anime.mal_id;
  const title = anime.name || anime.title || "Anime";
  const poster =
    anime.poster ||
    anime.image ||
    anime.images?.jpg?.large_image_url ||
    "/placeholder.jpg";
  const rating = anime.rating || anime.score || "N/A";
  const episodes = anime.episodes?.sub || anime.episodes || "?";
  const type = anime.type || "TV";

  const isFavorite = favorites.some((f) => f.id === animeId);

  card.innerHTML = `
        <div class="card-image">
            <img src="${poster}" 
                 alt="${title}" 
                 loading="lazy"
                 onerror="this.src='/placeholder.jpg'">
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

// ABRE DETALHES DO ANIME
window.openAnimeDetails = function (animeId, animeTitle) {
  console.log(`🎬 Abrindo: ${decodeURIComponent(animeTitle)}`);
  window.location.href = `anime.html?id=${animeId}&title=${animeTitle}`;
};

// FAVORITOS
window.toggleFavorite = function (id, title, image) {
  const index = favorites.findIndex((f) => f.id === id);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push({ id, title, image });
  }
  saveFavorites();

  // Atualiza UI
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
  if (saved) {
    favorites = JSON.parse(saved);
  }
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function showFavorites() {
  hasNextPage = false; // Desabilita scroll infinito
  if (favorites.length === 0) {
    showEmptyState("Nenhum favorito adicionado");
    return;
  }
  displayContent(favorites);
}

// UTILITÁRIOS
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function showLoadingState() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando animes...</p>
        </div>
    `;
}

function showLoadMoreIndicator(show) {
  const indicator = document.getElementById("load-more-indicator");
  if (indicator) {
    indicator.classList.toggle("active", show);
  }
}

function showEmptyState(message) {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="loading-state">
            <p style="font-size: 48px;">📭</p>
            <p>${message}</p>
        </div>
    `;
}

function showError(message) {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="loading-state">
            <p style="font-size: 48px;">❌</p>
            <p>${message}</p>
        </div>
    `;
}

function showAccessDenied() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="loading-state">
            <h2 style="color: #ff6b6b;">🔒 Acesso Restrito</h2>
            <p>Você precisa de uma assinatura ativa.</p>
            <button onclick="window.location.href='index.html'" 
                    style="margin-top: 20px; padding: 12px 30px; background: linear-gradient(135deg, #ff6b6b 0%, #ff8787 100%); border: none; border-radius: 10px; color: white; font-weight: 700; cursor: pointer;">
                Voltar ao Login
            </button>
        </div>
    `;
}

function logout() {
  window.supabase.auth.signOut();
  window.location.href = "index.html";
}
