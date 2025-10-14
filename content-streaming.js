// content-streaming.js - VERSÃO CORRIGIDA
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

async function init() {
  console.log("🚀 Iniciando aplicação...");

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
  }
}

function setupEventListeners() {
  console.log("🔧 Configurando event listeners...");

  // Busca
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 500));
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
      } else if (filter === "trending") {
        loadTrending();
      } else if (filter === "anime") {
        loadAllAnimes();
      } else {
        loadContent();
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
// AGUARDAR API
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
    const maxAttempts = 100;

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

    const {
      data: { user },
      error: authError,
    } = await window.supabase.auth.getUser();

    if (authError || !user) {
      console.log("❌ Usuário não autenticado");
      showAccessDenied();
      return;
    }

    console.log("✅ Usuário autenticado:", user.email);
    currentUser = {
      id: user.id,
      email: user.email,
    };

    // CORREÇÃO: Atualizar email do usuário no header
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
    const response = await window.AnimeAPI.loadContentForHomepage();
    console.log("📦 Resposta da API:", response);

    if (!response || response.status !== 200) {
      throw new Error("Resposta inválida da API");
    }

    const data = response.data;
    console.log("📊 Dados processados:", data);

    // LOG DETALHADO: Verificar propriedades disponíveis
    console.log("🔍 PROPRIEDADES DA API:", Object.keys(data));
    console.log("🔍 spotLightAnimes:", data.spotLightAnimes?.length || 0);
    console.log("🔍 trendingAnimes:", data.trendingAnimes?.length || 0);
    console.log("🔍 latestEpisodes:", data.latestEpisodes?.length || 0);
    console.log("🔍 topUpcomingAnimes:", data.topUpcomingAnimes?.length || 0);
    console.log("🔍 top10Animes:", data.top10Animes);

    if (!data) {
      throw new Error("Estrutura de dados inválida");
    }

    const dynamicContainer = document.getElementById(
      "dynamic-content-container"
    );
    if (!dynamicContainer) {
      throw new Error("Container dinâmico não encontrado");
    }

    dynamicContainer.innerHTML = "";

    // CORREÇÃO: Mapear seções com os nomes CORRETOS da API
    const sections = [
      {
        title: "⭐ Animes em Destaque",
        data: data.spotLightAnimes || data.spotlightAnimes,
        id: "spotlight",
      },
      {
        title: "🔥 Animes em Tendência",
        data: data.trendingAnimes,
        id: "trending",
      },
      {
        title: "📺 Animes Mais Populares",
        data: data.mostPopularAnimes,
        id: "popular",
      },
      {
        title: "❤️ Mais Favoritados",
        data: data.mostFavoriteAnimes,
        id: "favorites-api",
      },
      {
        title: "🏆 Top 10 Hoje",
        data: data.top10Animes?.today,
        id: "top10-today",
      },
      {
        title: "🏆 Top 10 Semana",
        data: data.top10Animes?.week,
        id: "top10-week",
      },
      {
        title: "🏆 Top 10 Mês",
        data: data.top10Animes?.month,
        id: "top10-month",
      },
      {
        title: "📡 Top Animes no Ar",
        data: data.topAiringAnimes,
        id: "airing",
      },
      {
        title: "🆕 Últimos Episódios",
        data: data.latestEpisodes || data.latestEpisodeAnimes,
        id: "latest",
      },
      {
        title: "✅ Recém-Completados",
        data: data.latestCompletedAnimes,
        id: "completed",
      },
      {
        title: "📜 Próximos Lançamentos",
        data: data.topUpcomingAnimes,
        id: "upcoming",
      },
      {
        title: "🎬 Animes em Destaque",
        data: data.featuredAnimes,
        id: "featured",
      },
    ];

    let renderedSections = 0;

    sections.forEach(({ title, data: sectionData, id }) => {
      if (sectionData && Array.isArray(sectionData) && sectionData.length > 0) {
        console.log(`✅ Renderizando: ${title} (${sectionData.length} itens)`);
        renderSection(title, sectionData, dynamicContainer, id);
        renderedSections++;

        if (id === "trending" || id === "popular") {
          contentDatabase.animes = [...contentDatabase.animes, ...sectionData];
        }
      } else {
        console.warn(`⚠️ Sem dados para: ${title}`);
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

async function loadTrending() {
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getAnimeByCategory(
      "most-popular",
      1
    );
    const dynamicContainer = document.getElementById(
      "dynamic-content-container"
    );

    if (dynamicContainer) {
      dynamicContainer.innerHTML = "";
      renderSection(
        "🔥 Animes em Tendência",
        response.data.animes,
        dynamicContainer,
        "trending"
      );
    }
  } catch (error) {
    console.error("Erro ao carregar trending:", error);
    showErrorMessage("Erro ao carregar animes em tendência");
  } finally {
    hideLoadingState();
  }
}

async function loadAllAnimes() {
  showLoadingState();
  try {
    const response = await window.AnimeAPI.getAnimeByCategory("tv", 1);
    const dynamicContainer = document.getElementById(
      "dynamic-content-container"
    );

    if (dynamicContainer) {
      dynamicContainer.innerHTML = "";
      renderSection(
        "📺 Todos os Animes",
        response.data.animes,
        dynamicContainer,
        "all-animes"
      );
    }
  } catch (error) {
    console.error("Erro ao carregar todos os animes:", error);
    showErrorMessage("Erro ao carregar animes");
  } finally {
    hideLoadingState();
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
  showErrorMessage("Erro ao carregar API. Usando dados locais.");
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

  console.log(
    `🎨 RenderContent - GridID: ${gridId}, Items: ${items?.length || 0}`
  );

  if (!grid) {
    console.error(`❌ Grid não encontrado: ${gridId}`);
    return;
  }

  if (!items || items.length === 0) {
    console.warn(`⚠️ Nenhum item para renderizar em ${gridId}`);
    return;
  }

  const cardsHTML = items.map((item) => createContentCard(item)).join("");
  console.log(`✅ ${items.length} cards criados para ${gridId}`);

  grid.innerHTML = cardsHTML;

  // Verificar se os cards foram inseridos no DOM
  setTimeout(() => {
    const insertedCards = grid.querySelectorAll(".content-card");
    console.log(
      `✅ ${insertedCards.length} cards inseridos no DOM (${gridId})`
    );
  }, 100);
}

function createContentCard(item) {
  const id = item.id || "";
  const title = item.name || item.title || "Sem título";
  const image =
    item.poster ||
    item.image ||
    "https://via.placeholder.com/300x450?text=No+Image";
  const rating = item.rating || item.score || "N/A";
  const episodes =
    item.episodes?.sub || item.totalEpisodes || item.episodes || "";
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
      const animes = results.data?.animes || results.animes || [];
      displaySearchResults(animes, query);
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
      <div class="no-results" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white;">
        <h3 style="font-size: 32px; margin-bottom: 15px;">😕 Nenhum resultado encontrado</h3>
        <p style="font-size: 18px; color: #9ca3af;">Não encontramos nada para "${escapeHtml(
          query
        )}"</p>
        <p style="color: #9ca3af; margin-top: 10px;">Tente pesquisar com outros termos.</p>
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

function showFavorites() {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
  const dynamicContainer = document.getElementById("dynamic-content-container");

  if (!dynamicContainer) return;

  dynamicContainer.innerHTML = "";

  if (favorites.length === 0) {
    dynamicContainer.innerHTML = `
      <div class="no-results" style="min-height: 60vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: white;">
        <h3 style="font-size: 32px; margin-bottom: 15px;">💔 Nenhum favorito ainda</h3>
        <p style="font-size: 18px; color: #9ca3af;">Adicione seus animes favoritos clicando no botão ❤️</p>
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

    const response = await window.AnimeAPI.getAnimeInfo(id);
    const anime =
      response.data?.anime?.info ||
      response.anime?.info ||
      response.data?.anime ||
      response;

    if (!anime) {
      throw new Error("Dados do anime não encontrados");
    }

    const infoHTML = `
      <div class="info-modal-overlay" onclick="closeInfoModal(event)" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px;">
        <div class="info-modal" onclick="event.stopPropagation()" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 30px;">
          <button onclick="closeInfoModal()" class="btn-close" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 20px; z-index: 10; transition: all 0.3s;">✕</button>
          <div class="info-content" style="display: flex; gap: 30px; flex-wrap: wrap;">
            <img src="${anime.poster || "https://via.placeholder.com/300x450"}" 
                 alt="${escapeHtml(anime.name || anime.title)}"
                 style="width: 250px; height: 375px; object-fit: cover; border-radius: 12px;"
                 onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
            <div class="info-details" style="flex: 1; min-width: 300px;">
              <h2 style="color: white; font-size: 28px; margin: 0 0 10px 0;">${escapeHtml(
                anime.name || anime.title || "Sem título"
              )}</h2>
              ${
                anime.jname
                  ? `<p style="color: #9ca3af; margin-bottom: 15px;">${escapeHtml(
                      anime.jname
                    )}</p>`
                  : ""
              }
              <div class="info-meta" style="display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 20px;">
                <span style="background: rgba(102, 126, 234, 0.2); padding: 8px 15px; border-radius: 8px; color: white;">⭐ ${
                  anime.rating || "N/A"
                }</span>
                ${
                  anime.stats?.episodes?.sub
                    ? `<span style="background: rgba(102, 126, 234, 0.2); padding: 8px 15px; border-radius: 8px; color: white;">📺 ${anime.stats.episodes.sub} eps</span>`
                    : ""
                }
                ${
                  anime.stats?.type
                    ? `<span style="background: rgba(102, 126, 234, 0.2); padding: 8px 15px; border-radius: 8px; color: white;">📅 ${anime.stats.type}</span>`
                    : ""
                }
                ${
                  anime.stats?.status
                    ? `<span style="background: rgba(102, 126, 234, 0.2); padding: 8px 15px; border-radius: 8px; color: white;">${anime.stats.status}</span>`
                    : ""
                }
              </div>
              <p style="margin: 20px 0; line-height: 1.6; color: #d1d5db;">${escapeHtml(
                anime.description || "Descrição não disponível."
              )}</p>
              <div class="info-actions" style="display: flex; gap: 15px; margin-top: 25px;">
                <button onclick="playContent('${escapeHtml(
                  id
                )}', '${type}'); closeInfoModal();" class="btn-play" style="flex: 1; padding: 12px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s;">
                  ▶️ Assistir Agora
                </button>
                <button onclick="addToFavorites('${escapeHtml(
                  id
                )}', '${type}')" class="btn-secondary" style="padding: 12px 20px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: 600; transition: all 0.3s;">
                  ❤️ Favoritar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", infoHTML);
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
  }
}

function hideLoadingState() {
  const loader = document.getElementById("loading-overlay");
  if (loader) {
    loader.style.display = "none";
  }
}

function showMessage(message) {
  const container = document.getElementById("toast-container") || document.body;
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.textContent = message;
  toast.style.cssText =
    "background: #667eea; color: white; padding: 15px 25px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); margin-bottom: 10px; animation: slideIn 0.3s ease; position: fixed; bottom: 20px; right: 20px; z-index: 10000;";

  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
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
    if (window.supabase) {
      window.supabase.auth
        .signOut()
        .then(() => {
          localStorage.clear();
          window.location.href = "index.html";
        })
        .catch(() => {
          localStorage.clear();
          window.location.href = "index.html";
        });
    } else {
      localStorage.clear();
      window.location.href = "index.html";
    }
  }
}

// ===========================
// DADOS MOCK
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
// MODAL DO PERFIL
// ===========================

function formatDateBR(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

// CORREÇÃO: Usar PLANS do config.js global (não redeclarar)
function getPlanName(planType) {
  if (typeof PLANS !== "undefined" && PLANS[planType]) {
    return PLANS[planType].name;
  }
  // Fallback se PLANS não estiver disponível
  const planNames = {
    monthly: "Mensal Premium",
    quarterly: "Trimestral Premium",
    annual: "Anual Premium",
    "7_dias": "7 Dias",
    "30_dias": "30 Dias",
  };
  return planNames[planType] || planType;
}

async function openProfileModal() {
  if (!currentUser || !currentSubscription) {
    showMessage("❌ Dados não disponíveis");
    return;
  }

  showLoadingState();

  try {
    const now = new Date();
    const expiresAt = new Date(currentSubscription.expires_at);
    const daysRemaining = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

    const recentHistory = watchHistory
      .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
      .slice(0, 5);

    let lastPayment = null;
    if (window.supabase) {
      const { data } = await window.supabase
        .from("payments")
        .select("*")
        .eq("user_id", currentUser.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      lastPayment = data;
    }

    const modalHTML = `
      <div class="profile-modal-overlay" onclick="closeProfileModal(event)" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.95); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 20px; overflow-y: auto;">
        <div class="profile-modal" onclick="event.stopPropagation()" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; max-width: 700px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative; padding: 30px;">
          <button onclick="closeProfileModal()" class="btn-close" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.1); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; font-size: 20px; z-index: 10; transition: all 0.3s;">✕</button>
          
          <div class="profile-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid rgba(102, 126, 234, 0.2);">
            <div class="profile-avatar" style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px;">👤</div>
            <div class="profile-info">
              <h2 style="color: white; font-size: 24px; margin: 0 0 8px 0;">${escapeHtml(
                currentUser.email
              )}</h2>
              <span class="profile-badge" style="background: rgba(102, 126, 234, 0.2); color: #667eea; padding: 6px 12px; border-radius: 6px; font-size: 14px; display: inline-block;">👑 Membro Premium</span>
            </div>
          </div>

          <div class="profile-stats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px; margin-bottom: 30px;">
            <div class="stat-card" style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 12px; padding: 15px; text-align: center;">
              <div class="stat-icon" style="font-size: 32px; margin-bottom: 8px;">⏰</div>
              <div class="stat-info">
                <h3 style="color: white; font-size: 24px; margin: 0 0 5px 0;">${Math.max(
                  0,
                  daysRemaining
                )}</h3>
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">Dias Restantes</p>
              </div>
            </div>

            <div class="stat-card" style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 12px; padding: 15px; text-align: center;">
              <div class="stat-icon" style="font-size: 32px; margin-bottom: 8px;">📺</div>
              <div class="stat-info">
                <h3 style="color: white; font-size: 24px; margin: 0 0 5px 0;">${
                  watchHistory.length
                }</h3>
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">Episódios</p>
              </div>
            </div>

            <div class="stat-card" style="background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 12px; padding: 15px; text-align: center;">
              <div class="stat-icon" style="font-size: 32px; margin-bottom: 8px;">❤️</div>
              <div class="stat-info">
                <h3 style="color: white; font-size: 24px; margin: 0 0 5px 0;">${
                  JSON.parse(localStorage.getItem("favorites") || "[]").length
                }</h3>
                <p style="color: #9ca3af; font-size: 13px; margin: 0;">Favoritos</p>
              </div>
            </div>
          </div>

          ${
            lastPayment
              ? `
          <div class="profile-section" style="margin-bottom: 25px;">
            <h3 style="color: white; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">💳 Informações de Pagamento</h3>
            <div class="payment-info" style="background: rgba(102, 126, 234, 0.05); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 8px; padding: 15px;">
              <p style="color: #d1d5db; margin: 0 0 8px 0; font-size: 14px;"><strong>Plano:</strong> ${getPlanName(
                currentSubscription.plan_type
              )}</p>
              <p style="color: #d1d5db; margin: 0 0 8px 0; font-size: 14px;"><strong>Valor:</strong> ${formatCurrency(
                lastPayment.amount
              )}</p>
              <p style="color: #d1d5db; margin: 0 0 8px 0; font-size: 14px;"><strong>Data:</strong> ${formatDateBR(
                lastPayment.created_at
              )}</p>
              <p style="color: #d1d5db; margin: 0 0 8px 0; font-size: 14px;"><strong>Expira em:</strong> ${formatDateBR(
                currentSubscription.expires_at
              )}</p>
              <p style="color: #d1d5db; margin: 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">✅ Ativo</span></p>
            </div>
          </div>
          `
              : `
          <div class="profile-section" style="margin-bottom: 25px;">
            <h3 style="color: white; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">💳 Assinatura</h3>
            <div class="payment-info" style="background: rgba(102, 126, 234, 0.05); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 8px; padding: 15px;">
              <p style="color: #d1d5db; margin: 0 0 8px 0; font-size: 14px;"><strong>Plano:</strong> ${getPlanName(
                currentSubscription.plan_type
              )}</p>
              <p style="color: #d1d5db; margin: 0 0 8px 0; font-size: 14px;"><strong>Expira em:</strong> ${formatDateBR(
                currentSubscription.expires_at
              )}</p>
              <p style="color: #d1d5db; margin: 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">✅ Ativo</span></p>
            </div>
          </div>
          `
          }

          ${
            recentHistory.length > 0
              ? `
          <div class="profile-section" style="margin-bottom: 25px;">
            <h3 style="color: white; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">📺 Continue Assistindo</h3>
            <div class="history-list" style="display: flex; flex-direction: column; gap: 10px;">
              ${recentHistory
                .map(
                  (item) => `
                <div class="history-item" onclick="playContent('${escapeHtml(
                  item.id
                )}', '${
                    item.type
                  }'); closeProfileModal();" style="background: rgba(102, 126, 234, 0.05); border: 1px solid rgba(102, 126, 234, 0.2); border-radius: 8px; padding: 12px; display: flex; gap: 15px; cursor: pointer; transition: all 0.3s; align-items: center;">
                  <img src="${item.image}" alt="${escapeHtml(
                    item.title
                  )}" style="width: 60px; height: 90px; object-fit: cover; border-radius: 6px;" onerror="this.src='https://via.placeholder.com/60x90?text=No+Image'">
                  <div class="history-details" style="flex: 1;">
                    <h4 style="color: white; font-size: 14px; margin: 0 0 5px 0; font-weight: 600;">${escapeHtml(
                      item.title
                    )}</h4>
                    <p style="color: #9ca3af; font-size: 12px; margin: 0;">⏱️ ${
                      item.progress
                    }% concluído</p>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
          `
              : `
          <div class="profile-section" style="margin-bottom: 25px;">
            <h3 style="color: white; font-size: 18px; margin: 0 0 15px 0; display: flex; align-items: center; gap: 8px;">📺 Histórico</h3>
            <p style="color: #9ca3af; text-align: center; padding: 20px;">🔭 Nenhum anime assistido ainda</p>
          </div>
          `
          }

          <div class="profile-actions" style="display: flex; gap: 15px; margin-top: 25px;">
            <button onclick="window.location.href='index.html#plans'" style="flex: 1; padding: 12px 20px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.3s ease; font-weight: 600; border: none; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
              🚀 Renovar Assinatura
            </button>
            <button onclick="closeProfileModal()" style="flex: 1; padding: 12px 20px; border-radius: 8px; font-size: 16px; cursor: pointer; transition: all 0.3s ease; font-weight: 600; border: none; background: rgba(255, 255, 255, 0.1); color: white;">
              Fechar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHTML);
  } catch (error) {
    console.error("❌ Erro ao abrir perfil:", error);
    showErrorMessage("Erro ao carregar perfil");
  } finally {
    hideLoadingState();
  }
}

function closeProfileModal(event) {
  if (event) event.stopPropagation();
  const modal = document.querySelector(".profile-modal-overlay");
  if (modal) modal.remove();
}

// ===========================
// EXPOSIÇÃO GLOBAL
// ===========================

window.playContent = playContent;
window.showInfo = showInfo;
window.searchContent = searchContent;
window.addToFavorites = addToFavorites;
window.logout = logout;
window.closeInfoModal = closeInfoModal;
window.viewAllSection = viewAllSection;
window.showFavorites = showFavorites;
window.openProfileModal = openProfileModal;
window.closeProfileModal = closeProfileModal;

// ===========================
// INICIALIZAÇÃO AUTOMÁTICA
// ===========================

document.addEventListener("DOMContentLoaded", function () {
  console.log("📄 DOM Carregado");
  setTimeout(() => {
    console.log("🎯 Iniciando aplicação...");
    init();
  }, 100);
});

console.log("✅ content-streaming.js carregado!");
