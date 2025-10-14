// content-streaming.js - VERSÃO SEM LOOPS

const USE_API = true;
let currentUser = null;
let currentSubscription = null;
let watchHistory = [];
let contentDatabase = { animes: [], movies: [], series: [] };
let isLoading = false; // NOVO: Prevenir múltiplos carregamentos

// ===========================
// INICIALIZAÇÃO
// ===========================

async function init() {
  if (isLoading) {
    console.log("⚠️ Já está carregando, ignorando...");
    return;
  }
  
  console.log("🚀 Iniciando aplicação...");
  isLoading = true;

  try {
    setupEventListeners();
    loadWatchHistory();

    console.log("⏳ Aguardando API...");
    await waitForAPI();
    console.log("✅ API disponível!");

    await verifyAccessAndLoadContent();
  } catch (error) {
    console.error("❌ Erro na inicialização:", error);
    hideLoadingState();
    showErrorMessage("Erro ao inicializar aplicação");
  } finally {
    isLoading = false;
  }
}

function setupEventListeners() {
  console.log("🔧 Configurando event listeners...");

  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 500));
  }

  const filterButtons = document.querySelectorAll(".nav-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset.filter;

      if (filter === "favorites") {
        showFavorites();
      } else if (filter === "trending") {
        loadTrending();
      } else if (filter === "anime") {
        loadAllAnimes();
      } else {
        loadContent();
      }
    });
  });

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
}

// ===========================
// AGUARDAR API (SEM LOOP INFINITO)
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
    const maxAttempts = 50; // Reduzido de 100

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

  try {
    if (!window.supabase) {
      throw new Error("Supabase não carregado");
    }

    const { data: { user }, error: authError } = await window.supabase.auth.getUser();

    if (authError || !user) {
      console.log("❌ Usuário não autenticado");
      showAccessDenied();
      return;
    }

    console.log("✅ Usuário autenticado:", user.email);
    currentUser = { id: user.id, email: user.email };

    const userEmail = document.getElementById("user-email");
    if (userEmail) {
      userEmail.textContent = user.email;
      userEmail.style.display = "inline-block";
    }

    localStorage.setItem("currentUser", JSON.stringify(currentUser));

    const { data: subscription, error: subError } = await window.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (subError && subError.code !== "PGRST116") {
      throw subError;
    }

    if (!subscription) {
      console.log("❌ Nenhuma assinatura ativa");
      showAccessDenied();
      return;
    }

    const now = new Date();
    const expiresAt = new Date(subscription.expires_at);

    if (now > expiresAt) {
      console.log("❌ Assinatura expirada");
      await window.supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", subscription.id);

      showAccessDenied();
      return;
    }

    console.log("✅ Assinatura ativa:", subscription);
    currentSubscription = subscription;
    localStorage.setItem("currentSubscription", JSON.stringify(subscription));

    showPremiumContent();
    await loadContent();
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
      <div class="access-denied" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 40px;">
        <h2 style="font-size: 48px; margin-bottom: 20px;">🔒</h2>
        <h2 style="color: white; margin-bottom: 15px;">Acesso Negado</h2>
        <p style="max-width: 500px; color: #9ca3af; margin: 20px 0;">Você precisa de uma assinatura Premium ativa para acessar este conteúdo exclusivo.</p>
        <button onclick="window.location.href='index.html'" style="margin-top: 20px; padding: 15px 40px; font-size: 18px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
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
// CARREGAMENTO DE CONTEÚDO (SEM RE-CARREGAMENTO)
// ===========================

async function loadContent() {
  if (isLoading) {
    console.log("⚠️ Já está carregando conteúdo...");
    return;
  }

  console.log("📦 Iniciando loadContent...");
  isLoading = true;
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
  } finally {
    isLoading = false;
  }
}

async function loadContentFromAPI() {
  console.log("📡 Carregando da API...");

  try {
    const response = await window.AnimeAPI.loadContentForHomepage();
    console.log("📦 Resposta da API:", response);

    if (!response || response.status !== 200) {
      throw new Error("Resposta inválida da API");
    }

    const data = response.data;
    console.log("📊 Dados processados:", data);
    console.log("🔍 PROPRIEDADES:", Object.keys(data));

    const dynamicContainer = document.getElementById("dynamic-content-container");
    if (!dynamicContainer) {
      throw new Error("Container dinâmico não encontrado");
    }

    dynamicContainer.innerHTML = "";

    // CORREÇÃO: Mapeamento correto baseado no seu log
    const sections = [
      { title: "⭐ Animes em Destaque", data: data.spotLightAnimes, id: "spotlight" },
      { title: "🔥 Em Tendência", data: data.trendingAnimes, id: "trending" },
      { title: "🆕 Últimos Episódios", data: data.latestEpisodes, id: "latest" },
      { title: "🏆 Top 10 - Dia", data: data.top10Animes?.day, id: "top10-day" },
      { title: "🏆 Top 10 - Semana", data: data.top10Animes?.week, id: "top10-week" },
      { title: "🏆 Top 10 - Mês", data: data.top10Animes?.month, id: "top10-month" },
      { title: "📜 Próximos Lançamentos", data: data.topUpcomingAnimes, id: "upcoming" },
    ];

    let renderedSections = 0;

    sections.forEach(({ title, data: sectionData, id }) => {
      if (sectionData && Array.isArray(sectionData) && sectionData.length > 0) {
        console.log(`✅ Renderizando: ${title} (${sectionData.length} itens)`);
        renderSection(title, sectionData, dynamicContainer, id);
        renderedSections++;
      }
    });

    if (renderedSections === 0) {
      throw new Error("Nenhuma seção com dados válidos");
    }

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

  if (!grid) {
    console.error(`❌ Grid não encontrado: ${gridId}`);
    return;
  }

  if (!items || items.length === 0) {
    console.warn(`⚠️ Nenhum item para renderizar em ${gridId}`);
    return;
  }

  const cardsHTML = items.map((item) => createContentCard(item)).join("");
  grid.innerHTML = cardsHTML;

  console.log(`✅ ${items.length} cards inseridos em ${gridId}`);
}

function createContentCard(item) {
  const id = item.id || "";
  const title = item.name || item.title || "Sem título";
  // CORREÇÃO: Fallback melhor para imagens
  const image = item.poster || item.image || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450'%3E%3Crect fill='%23667eea' width='300' height='450'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-size='20' text-anchor='middle' dy='.3em'%3ESem Imagem%3C/text%3E%3C/svg%3E";
  const rating = item.rating || item.score || "N/A";
  const episodes = item.episodes?.sub || item.totalEpisodes || item.episodes || "";
  const type = item.type || "anime";

  return `
    <div class="content-card" data-id="${escapeHtml(id)}" data-type="${type}">
      <div class="card-image">
        <img src="${image}" alt="${escapeHtml(title)}" loading="lazy" 
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27300%27 height=%27450%27%3E%3Crect fill=%27%23667eea%27 width=%27300%27 height=%27450%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 fill=%27white%27 font-size=%2720%27 text-anchor=%27middle%27 dy=%27.3em%27%3ESem Imagem%3C/text%3E%3C/svg%3E'">
      </div>
      
      ${episodes ? `<span class="card-badge badge-new">${episodes} EPs</span>` : ""}
      
      <div class="card-overlay">
        <div class="overlay-details">
          <h4 class="card-title">${escapeHtml(title)}</h4>
          <div class="card-meta">
            <span class="card-rating">⭐ ${rating}</span>
            ${episodes ? `<span>${episodes} eps</span>` : ""}
          </div>
        </div>

        <div class="card-actions">
          <button onclick="playContent('${escapeHtml(id)}', '${type}')" class="btn-play">
            ▶️ Assistir
          </button>
          <button onclick="showInfo('${escapeHtml(id)}', '${type}')" class="btn-info">
            ℹ️ Info
          </button>
          <button onclick="addToFavorites('${escapeHtml(id)}', '${type}')" class="btn-favorite">
            ❤️
          </button>
        </div>
      </div>
    </div>
  `;
}

// [... resto do código permanece igual ...]

// UTILITÁRIOS
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
  if (loader) loader.style.display = "flex";
}

function hideLoadingState() {
  const loader = document.getElementById("loading-overlay");
  if (loader) loader.style.display = "none";
}

function showMessage(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = "position: fixed; bottom: 20px; right: 20px; background: #667eea; color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000; animation: slideIn 0.3s ease;";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showErrorMessage(message) {
  console.error("❌", message);
  showMessage(message);
}

// EXPOR FUNÇÕES GLOBAIS
window.playContent = (id, type) => {
  console.log(`▶️ Reproduzindo: ${id}`);
  window.location.href = `player.html?id=${encodeURIComponent(id)}&ep=1`;
};

window.showInfo = async (id, type) => {
  console.log(`ℹ️ Mostrando info: ${id}`);
  showMessage("Carregando informações...");
};

window.addToFavorites = (id, type) => {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const key = `${type}-${id}`;
  if (favorites.includes(key)) {
    showMessage("❤️ Já está nos favoritos!");
  } else {
    favorites.push(key);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    showMessage("✅ Adicionado aos favoritos!");
  }
};

window.viewAllSection = (sectionId) => showMessage("Funcionalidade em desenvolvimento! 🚧");
window.logout = () => {
  if (confirm("Deseja realmente sair?")) {
    localStorage.clear();
    window.location.href = "index.html";
  }
};

// INICIALIZAÇÃO (APENAS UMA VEZ)
let initialized = false;
document.addEventListener("DOMContentLoaded", function () {
  if (initialized) {
    console.log("⚠️ Já inicializado, ignorando...");
    return;
  }
  initialized = true;
  console.log("📄 DOM Carregado");
  setTimeout(() => {
    console.log("🎯 Iniciando aplicação...");
    init();
  }, 100);
});

console.log("✅ content-streaming.js carregado (sem loops)!");