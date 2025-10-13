// content-streaming.js
// Lógica completa da plataforma de streaming com API

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

// ... (setupEventListeners, verifyAccessAndLoadContent, showAccessDenied, showPremiumContent, e funções auxiliares permanecem as mesmas)

// ===========================
// NOVO: CARREGAR CONTEÚDO DA API (TODOS OS TIPOS DE LISTA)
// ===========================

async function loadContent() {
  showLoadingState();

  try {
    if (USE_API && window.AnimeAPI) {
      console.log("📡 Carregando dados completos da API...");

      // Chamar o endpoint que agrega todos os dados
      const data = await window.AnimeAPI.loadContentForHomepage();

      // Mapear os dados recebidos para as seções dinâmicas
      const dynamicData = {
        "Animes em Destaque (Spotlight)": data.spotlightAnimes,
        "Animes Populares": data.mostPopularAnimes,
        "Animes Mais Favoritados": data.mostFavoriteAnimes,
        "Top 10 Animes": data.top10Animes,
        "Animes em Tendência": data.trendingAnimes,
        "Últimos Episódios": data.latestEpisodeAnimes,
        "Recém-Completados": data.latestCompletedAnimes,
        "Em Lançamento (Airing)": data.topAiringAnimes,
        "Próximos Lançamentos": data.topUpcomingAnimes,
      };

      // Limpa o container de conteúdo dinâmico
      const dynamicContainer = document.getElementById(
        "dynamic-content-container"
      );
      if (dynamicContainer) dynamicContainer.innerHTML = "";

      // Renderizar todas as seções dinâmicas
      for (const [title, items] of Object.entries(dynamicData)) {
        if (items && items.length > 0) {
          const sectionId = title.replace(/\s+/g, "-").toLowerCase();

          const sectionHTML = `
                  <section class="content-section" id="${sectionId}-section">
                      <div class="section-header">
                          <h3>${title}</h3>
                          <button class="btn-see-all">Ver Todos →</button>
                      </div>
                      <div class="content-grid" id="${sectionId}-grid">
                          </div>
                  </section>
              `;
          dynamicContainer.innerHTML += sectionHTML;
          renderContent(`${sectionId}-grid`, items);

          // Armazenar os animes principais no contentDatabase para busca/filtro (opcional)
          if (title === "Animes em Tendência") {
            contentDatabase.animes = items;
          }
        }
      }

      // Esconder seção de Fallback (Animes em Alta) se tivermos dados da API
      const fallbackSection = document.getElementById("animes-grid-section");
      if (fallbackSection) fallbackSection.style.display = "none";
    } else {
      // **Lógica de Fallback/Mock Data (Mantenha esta parte para segurança)**
      console.log("💾 Usando dados locais...");
      const mockAnimes = getMockData("anime");
      const mockMovies = getMockData("movie");
      const mockSeries = getMockData("series");

      contentDatabase.animes = mockAnimes;
      contentDatabase.movies = mockMovies;
      contentDatabase.series = mockSeries;

      renderContent("animes-grid", mockAnimes);
      document.getElementById("animes-grid-section").style.display = "block";
    }

    loadContinueWatching();
    hideLoadingState();
  } catch (error) {
    console.error("Erro ao carregar conteúdo:", error);
    hideLoadingState();
    showErrorMessage("Erro ao carregar conteúdo. Usando dados locais.");

    // Fallback completo para dados locais (se a API falhar)
    const mockAnimes = getMockData("anime");
    const mockMovies = getMockData("movie");
    const mockSeries = getMockData("series");

    contentDatabase.animes = mockAnimes;
    contentDatabase.movies = mockMovies;
    contentDatabase.series = mockSeries;

    renderContent("animes-grid", mockAnimes);
    document.getElementById("animes-grid-section").style.display = "block";

    loadContinueWatching();
  }
}

// ... (getMockData permanece a mesma)

// ===========================
// CORREÇÃO CRÍTICA: RENDERIZAÇÃO E ONCLICK ESCAPADO
// ===========================

function renderContent(gridId, items) {
  const grid = document.getElementById(gridId);
  if (!grid) return;

  grid.innerHTML = items
    .map(
      (item) => `
    <div class="content-card" data-id="${item.id}" data-type="${item.type}">
      
      <div class="card-image">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
      </div>
      
      ${item.new ? '<span class="card-badge badge-new">NOVO</span>' : ""}
      ${item.hd ? '<span class="card-badge badge-hd">HD</span>' : ""}
      
      <div class="card-overlay">
        
        <div class="overlay-details">
            <h4 class="card-title">${item.title}</h4>
            <div class="card-meta">
              <span class="card-rating">⭐ ${item.rating}</span>
              <span>${item.year}</span>
              ${item.episodes ? `<span>${item.episodes} eps</span>` : ""}
              ${item.duration ? `<span>${item.duration}</span>` : ""}
              ${item.seasons ? `<span>${item.seasons} temp</span>` : ""}
            </div>
        </div>

        <div class="card-actions">
           <button onclick="playContent(${item.id}, \'${
        item.type
      }\')" class="btn-play">
            ▶️ Assistir
          </button>
         
           <button onclick="showInfo(${item.id}, \'${
        item.type
      }\')" class="btn-info">
            ℹ️ Info
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

// Continue assistindo (simulado com localStorage)
function loadContinueWatching() {
  const grid = document.getElementById("continue-grid");
  if (!grid) return;

  const savedHistory = localStorage.getItem("watch_history");
  let watchHistory = [];

  if (savedHistory) {
    try {
      watchHistory = JSON.parse(savedHistory);
    } catch (e) {
      watchHistory = [];
    }
  }

  // Se não tiver histórico, usar conteúdo de exemplo mockado (SIMULAÇÃO)
  if (watchHistory.length === 0) {
    watchHistory = [
      // ... (dados mockados de histórico permanecem os mesmos)
      {
        id: 1,
        title: "One Piece",
        image: "...",
        type: "anime",
        progress: 45,
        lastWatched: new Date().toISOString(),
        rating: 9.5,
        year: 2023,
      },
      {
        id: 2,
        title: "Naruto",
        image: "...",
        type: "anime",
        progress: 70,
        lastWatched: new Date().toISOString(),
        rating: 9.2,
        year: 2023,
      },
      {
        id: 3,
        title: "Attack on Titan",
        image: "...",
        type: "anime",
        progress: 30,
        lastWatched: new Date().toISOString(),
        rating: 9.8,
        year: 2023,
      },
    ];
    // Ocultar a seção "Continue Assistindo" se estiver vazia (melhor UX)
    document.getElementById("continue-watching-section").style.display = "none";
  } else {
    document.getElementById("continue-watching-section").style.display =
      "block";
  }

  const sortedHistory = watchHistory
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, 6);

  grid.innerHTML = sortedHistory
    .map(
      (item) => `
    <div class="content-card" onclick="playContent(${item.id}, \'${item.type}\')">
      
      <div class="card-image">
        <img src="${item.image}" alt="${item.title}" loading="lazy">
      </div>

      <div class="progress-bar">
        <div class="progress-fill" style="width: ${item.progress}%;"></div>
      </div>
      
      <div class="card-overlay">
        <div class="overlay-details">
            <h4 class="card-title">${item.title}</h4>
            <div class="card-meta">
              <span>⏱️ ${item.progress}% concluído</span>
            </div>
        </div>
       <div class="card-actions">
          <button onclick="playContent(${item.id}, \'${item.type}\')" class="btn-play">
            ▶️ Continuar
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

// ... (Resto das funções como filterContent, searchContent, playContent, showInfo, etc. permanecem as mesmas)

// ===========================
// FUNÇÕES DE EXPOSIÇÃO GLOBAL
// ===========================

// Expor funções globalmente
window.playContent = playContent;
window.showInfo = showInfo;
window.searchContent = searchContent;
window.filterContent = filterContent;
window.addToFavorites = addToFavorites;
window.logout = logout;

// ... (Resto das funções de UI)

console.log("✅ content-streaming.js carregado com sucesso!");
