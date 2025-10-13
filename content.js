// content.js - VERSÃO CORRIGIDA E COMPLETA
// Lógica da página de conteúdo premium com integração da API

// ===========================
// INICIALIZAÇÃO
// ===========================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 Iniciando content.js...");
  await verifyAccessAndLoadContent();
  setupEventListeners();
});

// ===========================
// VERIFICAÇÃO DE ACESSO
// ===========================

async function verifyAccessAndLoadContent() {
  try {
    const user = await checkAuth();

    if (!user) {
      console.warn("⚠️ Usuário não autenticado");
      redirectToLogin();
      return;
    }

    // Mostrar email do usuário
    const userEmailEl = document.getElementById("user-email");
    if (userEmailEl) {
      userEmailEl.textContent = user.email;
    }

    // Verificar assinatura
    const subscription = await checkSubscription(user.id);

    if (!subscription) {
      console.warn("⚠️ Sem assinatura ativa");
      showAccessDeniedMessage();
      return;
    }

    // Verificar se a assinatura expirou
    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);

    if (now > expiresAt) {
      console.warn("⚠️ Assinatura expirada");
      await updateSubscriptionStatus(subscription.id, "expired");
      showAccessDeniedMessage();
      return;
    }

    // Acesso concedido - carregar conteúdo
    console.log("✅ Acesso concedido!");
    await loadPremiumContent();
  } catch (error) {
    console.error("❌ Erro ao verificar acesso:", error);
    showErrorMessage("Erro ao verificar acesso. Tente novamente.");
  }
}

// ===========================
// CARREGAR CONTEÚDO
// ===========================

async function loadPremiumContent() {
  showLoadingOverlay(true);

  try {
    // Verificar se a API está disponível
    if (!window.AnimeAPI) {
      throw new Error("API não carregada");
    }

    console.log("📡 Carregando conteúdo da API...");

    // Carregar dados da homepage
    const homepageData = await window.AnimeAPI.loadContentForHomepage();

    if (!homepageData || !homepageData.data) {
      throw new Error("Dados da API inválidos");
    }

    console.log("✅ Dados carregados:", homepageData);

    // Renderizar seções
    renderContentSections(homepageData.data);

    // Carregar histórico de visualização
    loadContinueWatching();
  } catch (error) {
    console.error("❌ Erro ao carregar conteúdo:", error);
    showErrorMessage("Erro ao carregar conteúdo. Usando dados de fallback.");
    renderFallbackContent();
  } finally {
    showLoadingOverlay(false);
  }
}

// ===========================
// RENDERIZAR SEÇÕES
// ===========================

function renderContentSections(data) {
  const container = document.getElementById("dynamic-content-container");

  if (!container) {
    console.error("❌ Container dinâmico não encontrado");
    return;
  }

  container.innerHTML = "";

  // Seções a renderizar
  const sections = [
    {
      title: "🔥 Em Alta",
      data: data.trendingAnimes,
      id: "trending",
    },
    {
      title: "⭐ Mais Populares",
      data: data.mostPopularAnimes,
      id: "popular",
    },
    {
      title: "📺 No Ar Agora",
      data: data.topAiringAnimes,
      id: "airing",
    },
    {
      title: "🆕 Últimos Episódios",
      data: data.latestEpisodeAnimes,
      id: "latest",
    },
    {
      title: "✅ Completos",
      data: data.latestCompletedAnimes,
      id: "completed",
    },
  ];

  sections.forEach((section) => {
    if (section.data && section.data.length > 0) {
      const sectionHTML = createSection(
        section.title,
        section.data,
        section.id
      );
      container.insertAdjacentHTML("beforeend", sectionHTML);
    }
  });

  console.log("✅ Seções renderizadas");
}

function createSection(title, animes, sectionId) {
  return `
    <section class="content-section" id="${sectionId}-section">
      <div class="section-header">
        <h3>${title}</h3>
      </div>
      <div class="content-grid" id="${sectionId}-grid">
        ${animes.map((anime) => createAnimeCard(anime)).join("")}
      </div>
    </section>
  `;
}

function createAnimeCard(anime) {
  const isFavorite = checkIfFavorite(anime.id);

  return `
    <div class="content-card" data-anime-id="${anime.id}">
      <div class="card-image">
        <img src="${anime.poster || anime.image}" 
             alt="${anime.name || anime.title}" 
             loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x400?text=Sem+Imagem'">
        
        ${
          anime.episodes
            ? `<span class="card-badge">EP ${
                anime.episodes.sub || anime.episodes.dub || "?"
              }</span>`
            : ""
        }
        
        <div class="card-overlay">
          <div class="overlay-details">
            <h4 class="card-title">${anime.name || anime.title}</h4>
            <div class="card-meta">
              ${anime.rating ? `<span>⭐ ${anime.rating}</span>` : ""}
              ${anime.type ? `<span>${anime.type}</span>` : ""}
            </div>
          </div>
          
          <div class="card-actions">
            <button class="btn-play" onclick="playAnime('${anime.id}')">
              ▶️ Assistir
            </button>
            <button class="btn-info" onclick="showAnimeInfo('${anime.id}')">
              ℹ️ Info
            </button>
          </div>
        </div>

        <button class="card-favorite ${isFavorite ? "active" : ""}" 
                onclick="toggleFavorite('${anime.id}', '${
    anime.name || anime.title
  }', '${anime.poster || anime.image}')"
                title="Adicionar aos favoritos">
          ${isFavorite ? "❤️" : "🤍"}
        </button>
      </div>
    </div>
  `;
}

// ===========================
// CONTINUAR ASSISTINDO
// ===========================

function loadContinueWatching() {
  const history = JSON.parse(localStorage.getItem("watch_history") || "[]");

  if (history.length === 0) {
    return;
  }

  const section = document.getElementById("continue-watching-section");
  const grid = document.getElementById("continue-grid");

  if (!section || !grid) return;

  section.style.display = "block";

  grid.innerHTML = history
    .slice(0, 6)
    .map((item) => createContinueWatchingCard(item))
    .join("");
}

function createContinueWatchingCard(item) {
  const progress = item.progress || 0;

  return `
    <div class="content-card" data-anime-id="${item.animeId}">
      <div class="card-image">
        <img src="${item.poster}" alt="${item.title}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/300x400?text=Sem+Imagem'">
        
        <span class="card-badge">EP ${item.episode}</span>
        
        <div class="card-overlay">
          <div class="overlay-details">
            <h4 class="card-title">${item.title}</h4>
            <div class="card-meta">
              <span>Episódio ${item.episode}</span>
            </div>
          </div>
          
          <div class="card-actions">
            <button class="btn-play" onclick="playAnime('${item.animeId}', ${item.episode})">
              ▶️ Continuar
            </button>
          </div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
      </div>
    </div>
  `;
}

// ===========================
// FAVORITOS
// ===========================

function checkIfFavorite(animeId) {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  return favorites.some((fav) => fav.id === animeId);
}

function toggleFavorite(animeId, title, poster) {
  event.stopPropagation();

  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const index = favorites.findIndex((fav) => fav.id === animeId);

  if (index > -1) {
    favorites.splice(index, 1);
    showToast("Removido dos favoritos", "info");
  } else {
    favorites.push({ id: animeId, title, image: poster });
    showToast("Adicionado aos favoritos", "success");
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));

  // Atualizar UI
  updateFavoriteButtons();
}

function updateFavoriteButtons() {
  document.querySelectorAll(".card-favorite").forEach((btn) => {
    const card = btn.closest(".content-card");
    const animeId = card.dataset.animeId;
    const isFavorite = checkIfFavorite(animeId);

    btn.classList.toggle("active", isFavorite);
    btn.textContent = isFavorite ? "❤️" : "🤍";
  });
}

// ===========================
// NAVEGAÇÃO
// ===========================

window.playAnime = function (animeId, episode = 1) {
  window.location.href = `player.html?id=${encodeURIComponent(
    animeId
  )}&ep=${episode}`;
};

window.showAnimeInfo = function (animeId) {
  window.location.href = `info.html?id=${encodeURIComponent(animeId)}`;
};

// ===========================
// BUSCA
// ===========================

function setupEventListeners() {
  const searchInput = document.getElementById("search-input");

  if (searchInput) {
    let searchTimeout;

    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();

      if (query.length < 2) {
        // Restaurar conteúdo original
        loadPremiumContent();
        return;
      }

      searchTimeout = setTimeout(() => {
        performSearch(query);
      }, 500);
    });
  }

  // Filtros de navegação
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const filter = btn.dataset.filter;
      applyFilter(filter);
    });
  });
}

async function performSearch(query) {
  showLoadingOverlay(true);

  try {
    console.log("🔍 Buscando:", query);

    const results = await window.AnimeAPI.searchAnimes(query);

    if (results && results.data && results.data.animes) {
      renderSearchResults(results.data.animes);
    } else {
      showNoResults();
    }
  } catch (error) {
    console.error("❌ Erro na busca:", error);
    showErrorMessage("Erro ao buscar. Tente novamente.");
  } finally {
    showLoadingOverlay(false);
  }
}

function renderSearchResults(animes) {
  const container = document.getElementById("dynamic-content-container");

  container.innerHTML = `
    <section class="content-section">
      <div class="section-header">
        <h3>🔍 Resultados da Busca</h3>
      </div>
      <div class="content-grid">
        ${animes.map((anime) => createAnimeCard(anime)).join("")}
      </div>
    </section>
  `;
}

function applyFilter(filter) {
  // Implementar filtros (todos, anime, trending, favorites)
  console.log("Filtro aplicado:", filter);

  if (filter === "favorites") {
    showFavorites();
  } else if (filter === "all") {
    loadPremiumContent();
  }
  // Adicionar mais filtros conforme necessário
}

function showFavorites() {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  if (favorites.length === 0) {
    document.getElementById("dynamic-content-container").innerHTML = `
      <section class="content-section">
        <div class="empty-favorites">
          <h3>❤️ Nenhum favorito ainda</h3>
          <p>Adicione animes aos favoritos clicando no coração</p>
        </div>
      </section>
    `;
    return;
  }

  // Renderizar favoritos
  document.getElementById("dynamic-content-container").innerHTML = `
    <section class="content-section">
      <div class="section-header">
        <h3>❤️ Seus Favoritos</h3>
      </div>
      <div class="content-grid">
        ${favorites.map((fav) => createAnimeCard(fav)).join("")}
      </div>
    </section>
  `;
}

// ===========================
// MENSAGENS E UI
// ===========================

function showAccessDeniedMessage() {
  document.body.innerHTML = `
    <div class="access-denied">
      <h2>🔒 Acesso Negado</h2>
      <p>Você precisa de uma assinatura ativa para acessar este conteúdo.</p>
      <button onclick="window.location.href='index.html'" class="btn-primary">
        Assinar Agora
      </button>
      <button onclick="window.location.href='login.html'" class="btn-secondary">
        Fazer Login
      </button>
    </div>
  `;
}

function showErrorMessage(message) {
  showToast(message, "error");
}

function showNoResults() {
  const container = document.getElementById("dynamic-content-container");
  container.innerHTML = `
    <section class="content-section">
      <div class="empty-favorites">
        <h3>🔍 Nenhum resultado encontrado</h3>
        <p>Tente buscar por outro termo</p>
      </div>
    </section>
  `;
}

function showLoadingOverlay(show) {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = show ? "flex" : "none";
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");

  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.style.cssText = `
    background: ${
      type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#667eea"
    };
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===========================
// FALLBACK
// ===========================

function renderFallbackContent() {
  const container = document.getElementById("dynamic-content-container");

  container.innerHTML = `
    <section class="content-section">
      <div class="section-header">
        <h3>⚠️ Modo Offline</h3>
      </div>
      <p style="color: #9ca3af; text-align: center; padding: 40px;">
        Não foi possível carregar o conteúdo da API. <br>
        Por favor, verifique sua conexão e tente novamente.
      </p>
      <div style="text-align: center;">
        <button onclick="location.reload()" class="btn-primary">
          🔄 Tentar Novamente
        </button>
      </div>
    </section>
  `;
}

// ===========================
// UTILITÁRIOS
// ===========================

function redirectToLogin() {
  setTimeout(() => {
    window.location.href = "login.html";
  }, 2000);
}

async function updateSubscriptionStatus(subscriptionId, status) {
  try {
    if (!window.supabase) return;

    const { error } = await window.supabase
      .from("subscriptions")
      .update({ status })
      .eq("id", subscriptionId);

    if (error) throw error;
  } catch (error) {
    console.error("Erro ao atualizar status:", error);
  }
}

async function logout() {
  try {
    if (!window.supabase) {
      window.location.href = "index.html";
      return;
    }

    const { error } = await window.supabase.auth.signOut();
    if (error) throw error;

    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    window.location.href = "index.html";
  }
}

// Adicionar estilos de animação
const style = document.createElement("style");
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

console.log("✅ content.js carregado e inicializado!");
