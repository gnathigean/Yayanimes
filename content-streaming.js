// content-streaming.js - APENAS HIANIME API
let currentUser = null;
let favorites = [];

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
      if (filter === "favorites") {
        showFavorites();
      } else if (filter === "home") {
        loadHomePage();
      } else if (filter === "tv") {
        loadAnimesByCategory("tv");
      } else if (filter === "movie") {
        loadAnimesByCategory("movie");
      }
    });
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
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
        console.error("❌ API não carregou após 5 segundos");
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
      console.log("❌ Usuário não autenticado");
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
      console.log("❌ Sem assinatura ativa");
      showAccessDenied();
      return;
    }

    console.log("✅ Assinatura válida até:", subscription.expires_at);
    await loadHomePage();
  } catch (error) {
    console.error("❌ Erro na verificação:", error);
    showAccessDenied();
  }
}

// CARREGA HOME PAGE (ANIMES EM DESTAQUE)
async function loadHomePage() {
  console.log("📺 Carregando home...");
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getHomePage();

    // Tenta pegar diferentes arrays de animes da home
    const animes =
      response.data.trending ||
      response.data.spotlightAnimes ||
      response.data.latestEpisodeAnimes ||
      [];

    console.log("✅ Animes carregados:", animes.length);

    if (animes.length === 0) {
      showEmptyState("Nenhum anime encontrado na home");
    } else {
      displayContent(animes);
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao carregar home");
  }
}

// CARREGA ANIMES POR CATEGORIA (TV, MOVIE, etc)
async function loadAnimesByCategory(category = "tv") {
  console.log(`📺 Carregando categoria: ${category}`);
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getAnimesByCategory(category, 1);
    console.log("✅ Animes carregados:", response.data.results.length);
    displayContent(response.data.results);
  } catch (error) {
    console.error("❌ Erro:", error);
    showError("Erro ao carregar categoria");
  }
}

// BUSCA DE ANIMES
async function handleSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    loadHomePage();
    return;
  }

  console.log("🔍 Buscando:", query);
  showLoadingState();

  try {
    const response = await window.AnimeAPI.search(query, 1);
    if (response.data.results.length === 0) {
      showEmptyState("Nenhum anime encontrado");
    } else {
      console.log("✅ Encontrados:", response.data.results.length);
      displayContent(response.data.results);
    }
  } catch (error) {
    console.error("❌ Erro na busca:", error);
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

// CRIA O CARD DO ANIME
function createContentCard(anime) {
  const card = document.createElement("div");
  card.className = "content-card";

  // Detecta se é HiAnime ou Jikan
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
                 loading="lazy">
            <div class="type-badge">${type}</div>
            <div class="card-overlay">
                <button class="play-btn" onclick="openAnimeDetails('${animeId}', '${encodeURIComponent(
    title
  )}')">
                    ▶ Assistir
                </button>
                <button class="fav-btn ${isFavorite ? "active" : ""}" 
                        onclick="toggleFavorite('${animeId}', '${title.replace(
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

// ABRE DETALHES DO ANIME (página anime.html)
window.openAnimeDetails = function (animeId, animeTitle) {
  console.log(
    `🎬 Abrindo detalhes: ${decodeURIComponent(animeTitle)} (ID: ${animeId})`
  );
  window.location.href = `anime.html?id=${animeId}&title=${animeTitle}`;
};

// FAVORITOS
window.toggleFavorite = function (id, title, image) {
  const index = favorites.findIndex((f) => f.id === id);
  if (index > -1) {
    favorites.splice(index, 1);
    console.log("💔 Removido dos favoritos:", title);
  } else {
    favorites.push({ id, title, image });
    console.log("❤️ Adicionado aos favoritos:", title);
  }
  saveFavorites();

  // Atualiza o botão
  const btn = event.target;
  btn.textContent = index > -1 ? "🤍" : "❤️";
  btn.classList.toggle("active");
};

function loadFavorites() {
  const saved = localStorage.getItem("favorites");
  if (saved) {
    favorites = JSON.parse(saved);
    console.log("✅ Favoritos carregados:", favorites.length);
  }
}

function saveFavorites() {
  localStorage.setItem("favorites", JSON.stringify(favorites));
}

function showFavorites() {
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
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function showLoadingState() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando...</p>
        </div>
    `;
}

function showEmptyState(message) {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="empty-state">
            <p>📭</p>
            <p>${message}</p>
        </div>
    `;
}

function showError(message) {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="error-state">
            <p>❌</p>
            <p>${message}</p>
        </div>
    `;
}

function showAccessDenied() {
  const mainContent = document.getElementById("main-content");
  mainContent.innerHTML = `
        <div class="access-denied">
            <h2>🔒 Acesso Restrito</h2>
            <p>Você precisa de uma assinatura ativa para acessar este conteúdo.</p>
            <button class="btn-primary" onclick="window.location.href='index.html'">Voltar ao Login</button>
        </div>
    `;
}

function logout() {
  window.supabase.auth.signOut();
  window.location.href = "index.html";
}
