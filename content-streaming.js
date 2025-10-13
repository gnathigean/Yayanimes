// content-streaming.js
// Lógica completa da plataforma de streaming com API

// ===========================
// CONFIGURAÇÃO
// ===========================

// IMPORTANTE: Configure a URL da sua API aqui
const USE_API = true; // true = usar API real, false = usar dados mockados

// Estado da aplicação
let currentUser = null;
let currentSubscription = null;
let watchHistory = [];
let currentPage = { animes: 1, movies: 1, series: 1 };
let isLoading = false;

// Banco de dados de conteúdo em memória
let contentDatabase = {
  animes: [],
  movies: [],
  series: [],
};

// Inicializar página
document.addEventListener("DOMContentLoaded", async () => {
  await verifyAccessAndLoadContent();
  setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
  // Busca
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") {
        searchContent();
      }
    });
  }

  // Botões de filtro
  const filterButtons = document.querySelectorAll(".nav-btn");
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const category = btn.dataset.category;
      filterContent(category);
    });
  });

  // Teclas de atalho
  document.addEventListener("keydown", (e) => {
    // ESC para limpar busca
    if (e.key === "Escape") {
      const searchInput = document.getElementById("search-input");
      if (searchInput && searchInput.value) {
        searchInput.value = "";
        loadContent();
      }
    }
  });
}

// Verificar acesso e carregar conteúdo
async function verifyAccessAndLoadContent() {
  const user = await checkAuth();

  if (!user) {
    showAccessDenied();
    return;
  }

  currentUser = user;
  document.getElementById("user-email").textContent = user.email;

  const subscription = await checkSubscription(user.id);

  if (!subscription) {
    showAccessDenied();
    return;
  }

  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);

  if (now > expiresAt) {
    await updateSubscriptionStatus(subscription.id, "expired");
    showAccessDenied();
    return;
  }

  currentSubscription = subscription;
  showPremiumContent(subscription);
  loadContent();
  loadWatchHistory();
}

// Mostrar acesso negado
function showAccessDenied() {
  document.getElementById("access-denied").style.display = "block";
  document.getElementById("premium-content").style.display = "none";
}

// Mostrar conteúdo premium
function showPremiumContent(subscription) {
  document.getElementById("access-denied").style.display = "none";
  document.getElementById("premium-content").style.display = "block";

  const planName = PLANS[subscription.plan_type].name;
  document.getElementById("sub-plan").textContent = planName;

  const planBadge = document.getElementById("plan-badge");
  if (planBadge) {
    planBadge.textContent = planName;
  }

  document.getElementById("sub-expires").textContent = formatDateBR(
    subscription.expires_at
  );

  // Calcular dias restantes
  const now = new Date();
  const expiresAt = new Date(subscription.expires_at);
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  const daysLeftElement = document.getElementById("days-left");
  if (daysLeftElement) {
    daysLeftElement.textContent = `${daysLeft} dias restantes`;
  }
}

// Carregar conteúdo
async function loadContent() {
  showLoadingState();

  try {
    if (USE_API && window.AnimeAPI) {
      // Usar API real
      console.log("📡 Carregando da API...");
      const data = await window.AnimeAPI.loadContentForHomepage();

      // Armazenar no contentDatabase
      contentDatabase.animes = data.animes || [];
      contentDatabase.movies = data.movies || [];
      contentDatabase.series = data.series || [];

      renderContent("animes-grid", contentDatabase.animes);
      renderContent("movies-grid", contentDatabase.movies);
      renderContent("series-grid", contentDatabase.series);
    } else {
      // Usar dados mockados
      console.log("💾 Usando dados locais...");
      const mockAnimes = getMockData("anime");
      const mockMovies = getMockData("movie");
      const mockSeries = getMockData("series");

      // Armazenar no contentDatabase
      contentDatabase.animes = mockAnimes;
      contentDatabase.movies = mockMovies;
      contentDatabase.series = mockSeries;

      renderContent("animes-grid", mockAnimes);
      renderContent("movies-grid", mockMovies);
      renderContent("series-grid", mockSeries);
    }

    // **Chamada crucial após o carregamento bem-sucedido**
    loadContinueWatching();
    hideLoadingState();
  } catch (error) {
    console.error("Erro ao carregar conteúdo:", error);
    hideLoadingState();
    showErrorMessage("Erro ao carregar conteúdo. Usando dados locais.");

    // Fallback para dados locais
    const mockAnimes = getMockData("anime");
    const mockMovies = getMockData("movie");
    const mockSeries = getMockData("series");

    contentDatabase.animes = mockAnimes;
    contentDatabase.movies = mockMovies;
    contentDatabase.series = mockSeries;

    renderContent("animes-grid", mockAnimes);
    renderContent("movies-grid", mockMovies);
    renderContent("series-grid", mockSeries);

    // Tenta carregar o histórico mesmo após o erro de API
    loadContinueWatching();
  }
}

// Dados mockados (fallback)
function getMockData(type) {
  const mockDatabase = {
    anime: [
      {
        id: 1,
        title: "One Piece",
        rating: 9.5,
        year: 2023,
        episodes: 1000,
        image:
          "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
        type: "anime",
        new: true,
        description:
          "A jornada de Monkey D. Luffy em busca do tesouro lendário One Piece.",
      },
      {
        id: 2,
        title: "Naruto Shippuden",
        rating: 9.2,
        year: 2023,
        episodes: 500,
        image:
          "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
        type: "anime",
        description: "Naruto continua sua jornada.",
      },
      {
        id: 3,
        title: "Attack on Titan",
        rating: 9.8,
        year: 2023,
        episodes: 87,
        image:
          "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400",
        type: "anime",
        new: true,
        description: "Humanidade vs gigantes.",
      },
    ],
    movie: [
      {
        id: 101,
        title: "Spider-Man",
        rating: 8.7,
        year: 2023,
        duration: "148 min",
        image:
          "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=400",
        type: "movie",
        hd: true,
        description: "Peter Parker enfrenta desafios.",
      },
      {
        id: 102,
        title: "Vingadores",
        rating: 9.1,
        year: 2023,
        duration: "181 min",
        image:
          "https://images.unsplash.com/photo-1608889335941-32ac5f2041b9?w=400",
        type: "movie",
        hd: true,
        description: "Heróis unidos.",
      },
    ],
    series: [
      {
        id: 201,
        title: "The Last of Us",
        rating: 9.4,
        year: 2023,
        seasons: 1,
        image:
          "https://images.unsplash.com/photo-1574267432644-f74abe6c97f0?w=400",
        type: "series",
        new: true,
        description: "Mundo pós-apocalíptico.",
      },
    ],
  };

  return mockDatabase[type] || [];
}

// Renderizar cards de conteúdo
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
          <button onclick="playContent(${item.id}, '${
        item.type
      }')" class="btn-play">
            ▶️ Assistir
          </button>
          <button onclick="showInfo(${item.id}, '${
        item.type
      }')" class="btn-info">
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
  // CRÍTICO: Garante que o elemento HTML existe antes de tentar manipulá-lo
  const grid = document.getElementById("continue-grid");
  if (!grid) return; // Sai da função se o elemento não for encontrado

  const savedHistory = localStorage.getItem("watch_history");

  let watchHistory = []; // Declara a variável localmente

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
      {
        id: 1,
        title: "One Piece",
        image:
          "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400",
        type: "anime",
        progress: 45,
        lastWatched: new Date().toISOString(),
        rating: 9.5,
        year: 2023,
      },
      {
        id: 2,
        title: "Naruto",
        image:
          "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400",
        type: "anime",
        progress: 70,
        lastWatched: new Date().toISOString(),
        rating: 9.2,
        year: 2023,
      },
      {
        id: 3,
        title: "Attack on Titan",
        image:
          "https://images.unsplash.com/photo-1618519764620-7403abdbdfe9?w=400",
        type: "anime",
        progress: 30,
        lastWatched: new Date().toISOString(),
        rating: 9.8,
        year: 2023,
      },
    ];
  }

  // Ordenar por último assistido
  const sortedHistory = watchHistory
    .sort((a, b) => new Date(b.lastWatched) - new Date(a.lastWatched))
    .slice(0, 6); // Mostrar apenas os 6 mais recentes

  // Se o grid existe (verificado no início), renderiza:
  grid.innerHTML = sortedHistory
    .map(
      (item) => `
    <div class="content-card" onclick="playContent(${item.id}, '${item.type}')">
      
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
          <button onclick="playContent(${item.id}, '${item.type}')" class="btn-play">
            ▶️ Continuar
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

// Filtrar conteúdo por categoria
function filterContent(category) {
  const sections = document.querySelectorAll(".content-section");
  const buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.dataset.category === category) {
      btn.classList.add("active");
    }
  });

  if (category === "all") {
    sections.forEach((section) => (section.style.display = "block"));
  } else {
    sections.forEach((section) => {
      const sectionCategory = section.dataset.category;
      section.style.display = sectionCategory === category ? "block" : "none";
    });
  }
}

// Buscar conteúdo
function searchContent() {
  const query = document
    .getElementById("search-input")
    .value.toLowerCase()
    .trim();

  if (!query) {
    loadContent();
    return;
  }

  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  const results = allContent.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
  );

  // Limpar grids
  const grids = ["animes-grid", "movies-grid", "series-grid"];
  grids.forEach((gridId) => {
    const grid = document.getElementById(gridId);
    if (grid) grid.innerHTML = "";
  });

  // Mostrar resultados
  if (results.length > 0) {
    const animesGrid = document.getElementById("animes-grid");
    if (animesGrid) {
      animesGrid.innerHTML = `
        <h3 style="grid-column: 1/-1; color: white; margin-bottom: 20px;">
          ${results.length} resultado(s) para "${query}"
        </h3>
      `;
      renderContent("animes-grid", results);
    }
  } else {
    const animesGrid = document.getElementById("animes-grid");
    if (animesGrid) {
      animesGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <p style="color: #9ca3af; font-size: 18px; margin-bottom: 10px;">
            Nenhum resultado encontrado para "${query}"
          </p>
          <button onclick="document.getElementById('search-input').value=''; loadContent();" 
                  style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 10px;">
            Limpar busca
          </button>
        </div>
      `;
    }
  }
}

// Reproduzir conteúdo
function playContent(id, type) {
  // Encontrar o item no banco de dados
  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  const item = allContent.find((i) => i.id === id && i.type === type);

  if (!item) {
    alert("❌ Conteúdo não encontrado!");
    return;
  }

  // Adicionar ao histórico
  addToWatchHistory(item);

  // Redirecionar para o player
  window.location.href = `player.html?id=${id}&ep=1`;
}

// Mostrar informações detalhadas
function showInfo(id, type) {
  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  const item = allContent.find((i) => i.id === id && i.type === type);

  if (!item) return;

  // Criar modal com informações
  const modal = document.createElement("div");
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
  `;

  modal.innerHTML = `
    <div style="background: #1f2937; border-radius: 12px; max-width: 600px; width: 100%; padding: 30px; position: relative;">
      <button onclick="this.closest('div[style*=fixed]').remove()" 
              style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">
        ✕
      </button>
      
      <img src="${item.image}" alt="${item.title}" 
           style="width: 100%; height: 300px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;">
      
      <h2 style="color: white; margin-bottom: 10px;">${item.title}</h2>
      
      <div style="display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap;">
        <span style="background: #667eea; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px;">
          ⭐ ${item.rating}
        </span>
        <span style="background: #374151; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px;">
          ${item.year}
        </span>
        ${
          item.episodes
            ? `<span style="background: #374151; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px;">${item.episodes} episódios</span>`
            : ""
        }
        ${
          item.duration
            ? `<span style="background: #374151; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px;">${item.duration}</span>`
            : ""
        }
        ${
          item.seasons
            ? `<span style="background: #374151; color: white; padding: 5px 12px; border-radius: 20px; font-size: 14px;">${item.seasons} temporada(s)</span>`
            : ""
        }
      </div>
      
      <p style="color: #d1d5db; line-height: 1.6; margin-bottom: 25px;">
        ${item.description || "Descrição não disponível."}
      </p>
      
      <div style="display: flex; gap: 10px;">
        <button onclick="playContent(${item.id}, '${
    item.type
  }'); this.closest('div[style*=fixed]').remove();" 
                style="flex: 1; background: #667eea; color: white; border: none; padding: 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 16px;">
          ▶️ Assistir Agora
        </button>
        <button onclick="addToFavorites(${item.id}, '${item.type}')" 
                style="background: #374151; color: white; border: none; padding: 12px 20px; border-radius: 6px; cursor: pointer;">
          ❤️
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Fechar ao clicar fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Adicionar ao histórico de visualização
function addToWatchHistory(item) {
  // Remover se já existir
  watchHistory = watchHistory.filter(
    (h) => !(h.id === item.id && h.type === item.type)
  );

  // Adicionar no início
  watchHistory.unshift({
    ...item,
    progress: Math.floor(Math.random() * 100), // Simular progresso
    lastWatched: new Date().toISOString(),
  });

  // Manter apenas os últimos 20 itens
  watchHistory = watchHistory.slice(0, 20);

  // Salvar no localStorage
  localStorage.setItem("watch_history", JSON.stringify(watchHistory));

  // Recarregar seção de continuar assistindo
  loadContinueWatching();
}

// Carregar histórico de visualização
function loadWatchHistory() {
  const savedHistory = localStorage.getItem("watch_history");
  if (savedHistory) {
    try {
      watchHistory = JSON.parse(savedHistory);
    } catch (e) {
      watchHistory = [];
    }
  }
}

// Adicionar aos favoritos
function addToFavorites(id, type) {
  const favorites = JSON.parse(localStorage.getItem("favorites") || "[]");

  const exists = favorites.some((f) => f.id === id && f.type === type);

  if (exists) {
    alert("❤️ Este item já está nos seus favoritos!");
  } else {
    favorites.push({ id, type, addedAt: new Date().toISOString() });
    localStorage.setItem("favorites", JSON.stringify(favorites));
    alert("✅ Adicionado aos favoritos!");
  }
}

// Atualizar status da assinatura
async function updateSubscriptionStatus(subscriptionId, status) {
  try {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: status })
      .eq("id", subscriptionId);

    if (error) throw error;
  } catch (error) {
    console.error("Erro ao atualizar status da assinatura:", error);
  }
}

// Logout
async function logout() {
  try {
    // Limpar histórico local
    const confirmClear = confirm(
      "Deseja limpar seu histórico de visualização?"
    );
    if (confirmClear) {
      localStorage.removeItem("watch_history");
      localStorage.removeItem("favorites");
    }

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    window.location.href = "index.html";
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    alert("Erro ao fazer logout. Tente novamente.");
  }
}

// Expor funções globalmente
window.playContent = playContent;
window.showInfo = showInfo;
window.searchContent = searchContent;
window.filterContent = filterContent;
window.addToFavorites = addToFavorites;
window.logout = logout;

// ===========================
// FUNÇÕES DE UI
// ===========================

function showLoadingState() {
  const grids = ["animes-grid", "movies-grid", "series-grid"];
  grids.forEach((gridId) => {
    const grid = document.getElementById(gridId);
    if (grid) {
      grid.innerHTML =
        '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><div class="loading-spinner"></div><p style="color: #9ca3af; margin-top: 10px;">Carregando...</p></div>';
    }
  });
}

function hideLoadingState() {
  // Loading será substituído pelo conteúdo
}

function showErrorMessage(message) {
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f59e0b;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 9999;
    max-width: 350px;
  `;
  notification.innerHTML = `<strong>⚠️ Aviso</strong><br>${message}`;
  document.body.appendChild(notification);

  setTimeout(() => notification.remove(), 5000);
}

console.log("✅ content-streaming.js carregado com sucesso!");
