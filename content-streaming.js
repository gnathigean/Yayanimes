// content-streaming.js - INTEGRADO COM HIANIME API + PLAYER HLS
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
      } else if (filter === "airing") {
        loadTopAiring();
      } else if (filter === "season") {
        loadCurrentSeason();
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
    await loadTopAiring();
  } catch (error) {
    console.error("❌ Erro na verificação:", error);
    showAccessDenied();
  }
}

async function loadTopAiring() {
  console.log("📺 Carregando animes em exibição...");
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getTopAiring(1);
    console.log("✅ Animes carregados:", response.data.results.length);
    displayContent(response.data.results);
  } catch (error) {
    console.error("❌ Erro ao carregar:", error);
    showError("Erro ao carregar animes em exibição");
  }
}

async function loadCurrentSeason() {
  console.log("📺 Carregando temporada atual...");
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getCurrentSeason(1);
    console.log("✅ Temporada carregada:", response.data.results.length);
    displayContent(response.data.results);
  } catch (error) {
    console.error("❌ Erro ao carregar:", error);
    showError("Erro ao carregar temporada atual");
  }
}

async function handleSearch(e) {
  const query = e.target.value.trim();
  if (!query) {
    loadTopAiring();
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

function createContentCard(anime) {
  const card = document.createElement("div");
  card.className = "content-card";
  const isFavorite = favorites.some((f) => f.id === anime.mal_id);
  const title = anime.title?.english || anime.title || "Anime";
  const totalEpisodes = anime.episodes || 12;

  card.innerHTML = `
        <div class="card-image">
            <img src="${
              anime.images?.jpg?.large_image_url ||
              anime.image ||
              "/placeholder.jpg"
            }" 
                 alt="${title}" 
                 loading="lazy">
            <div class="type-badge">${anime.type || "TV"}</div>
            <div class="card-overlay">
                <button class="play-btn" onclick="openPlayer('${
                  anime.mal_id
                }', '${encodeURIComponent(title)}', ${totalEpisodes})">
                    ▶ Assistir
                </button>
                <button class="fav-btn ${
                  isFavorite ? "active" : ""
                }" onclick="toggleFavorite(${anime.mal_id}, '${title}', '${
    anime.images?.jpg?.large_image_url
  }')">
                    ${isFavorite ? "❤️" : "🤍"}
                </button>
            </div>
        </div>
        <div class="card-info">
            <h3 class="card-title">${title}</h3>
            <div class="card-meta">
                <span>${anime.score || "N/A"} ⭐</span>
                <span>${totalEpisodes} eps</span>
            </div>
        </div>
    `;
  return card;
}

// FUNÇÃO GLOBAL PARA ABRIR PLAYER
// Atualizar apenas a função openPlayer:

window.openPlayer = async function (malId, animeTitle, totalEpisodes) {
  console.log(`🎬 Abrindo detalhes do anime: ${animeTitle}`);

  try {
    // Busca ID da HiAnime
    const searchResponse = await window.AnimeAPI.searchHiAnime(
      decodeURIComponent(animeTitle)
    );

    if (
      searchResponse.success &&
      searchResponse.data.results &&
      searchResponse.data.results.length > 0
    ) {
      const hiAnimeId = searchResponse.data.results[0].id;
      console.log(`✅ HiAnime ID: ${hiAnimeId}`);

      // Redireciona para a página de detalhes do anime
      window.location.href = `anime.html?id=${hiAnimeId}&title=${animeTitle}`;
    } else {
      alert(`❌ Anime "${decodeURIComponent(animeTitle)}" não encontrado`);
    }
  } catch (error) {
    console.error("❌ Erro:", error);
    alert("❌ Erro ao buscar anime");
  }
};

// FUNÇÕES DE FAVORITOS
window.toggleFavorite = async function (id, title, image) {
  const index = favorites.findIndex((f) => f.id === id);
  if (index > -1) {
    favorites.splice(index, 1);
    console.log("💔 Removido dos favoritos:", title);
  } else {
    favorites.push({ id, title, image });
    console.log("❤️ Adicionado aos favoritos:", title);
  }
  saveFavorites();

  // Atualiza o ícone
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
