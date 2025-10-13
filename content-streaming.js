// content-streaming.js - CORREÇÃO DO LOADING INFINITO

// ===========================
// CONTROLE DE ACESSO - CORRIGIDO
// ===========================

async function verifyAccessAndLoadContent() {
  console.log("🔐 Verificando acesso...");

  const savedUser = localStorage.getItem("currentUser");
  const savedSubscription = localStorage.getItem("currentSubscription");

  console.log("👤 User:", savedUser);
  console.log("💎 Subscription:", savedSubscription);

  if (savedUser && savedSubscription) {
    try {
      currentUser = JSON.parse(savedUser);
      currentSubscription = JSON.parse(savedSubscription);

      // Atualizar email do usuário
      const userEmail = document.getElementById("user-email");
      if (userEmail && currentUser.email) {
        userEmail.textContent = currentUser.email;
      }

      // VERIFICAÇÃO CORRIGIDA
      if (
        currentSubscription === "premium" ||
        currentSubscription.status === "active"
      ) {
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
  } else {
    console.log("❌ Sem dados de usuário/assinatura");
    showAccessDenied();
  }
}

// ===========================
// CARREGAMENTO - CORRIGIDO
// ===========================

async function loadContent() {
  console.log("📦 Iniciando loadContent...");
  showLoadingState();

  try {
    // VERIFICAÇÃO CRÍTICA: Aguardar API estar disponível
    if (!window.AnimeAPI) {
      console.warn("⚠️ API ainda não carregada, aguardando...");
      await waitForAPI();
    }

    if (USE_API && window.AnimeAPI) {
      console.log("🌐 Usando API...");
      await loadContentFromAPI();
    } else {
      console.log("💾 Usando dados mock...");
      loadContentFromMock();
    }

    loadContinueWatching();
    hideLoadingState();
    console.log("✅ Conteúdo carregado!");
  } catch (error) {
    console.error("❌ Erro ao carregar conteúdo:", error);
    handleLoadError(error);
  }
}

// NOVA FUNÇÃO: Aguardar API carregar
function waitForAPI() {
  return new Promise((resolve) => {
    if (window.AnimeAPI) {
      resolve();
      return;
    }

    let attempts = 0;
    const maxAttempts = 50; // 5 segundos (50 * 100ms)

    const checkInterval = setInterval(() => {
      attempts++;

      if (window.AnimeAPI) {
        clearInterval(checkInterval);
        console.log("✅ API carregada após", attempts * 100, "ms");
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        console.error("❌ Timeout aguardando API");
        resolve(); // Resolve mesmo assim para continuar com mock
      }
    }, 100);
  });
}

async function loadContentFromAPI() {
  console.log("📡 Carregando da API...");

  try {
    const data = await window.AnimeAPI.loadContentForHomepage();
    console.log("📦 Dados recebidos:", data);

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
      if (data && data.length > 0) {
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
      throw new Error("Nenhuma seção renderizada");
    }

    // Esconder fallback
    const fallbackSection = document.getElementById("animes-grid-section");
    if (fallbackSection) {
      fallbackSection.style.display = "none";
    }

    console.log(`✅ ${renderedSections} seções carregadas!`);
  } catch (error) {
    console.error("❌ Erro em loadContentFromAPI:", error);
    throw error;
  }
}

// ===========================
// INFORMAÇÕES DO ANIME - CORRIGIDO
// ===========================

async function showInfo(id, type) {
  console.log(`ℹ️ Carregando info de: ${id}`);
  showLoadingState();

  try {
    if (!window.AnimeAPI) {
      throw new Error("API não disponível");
    }

    // CORREÇÃO: Usar ID correto da API
    // Se o ID vier com formato especial, limpar
    const cleanId = id.replace(/^anime-/, "");

    console.log(`📡 Buscando: ${cleanId}`);
    const animeData = await window.AnimeAPI.getAnimeInfo(cleanId);
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
                  cleanId
                )}', '${type}'); closeInfoModal();" class="btn-play">
                  ▶️ Assistir Agora
                </button>
                <button onclick="addToFavorites('${escapeHtml(
                  cleanId
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
    showErrorMessage(`Erro ao carregar informações: ${error.message}`);
  } finally {
    hideLoadingState();
  }
}

// ===========================
// REPRODUÇÃO - CORRIGIDO
// ===========================

function playContent(id, type) {
  console.log(`▶️ Reproduzindo: ${id}`);

  // Limpar ID se necessário
  const cleanId = id.replace(/^anime-/, "");

  // Redirecionar para o player
  window.location.href = `player.html?id=${encodeURIComponent(cleanId)}&ep=1`;
}

// ===========================
// UTILITÁRIOS - ADICIONAR
// ===========================

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
