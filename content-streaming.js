// Database temporário de conteúdos
const contentDatabase = {
  animes: [
    {
      id: 1,
      title: "Fullmetal Alchemist: Brotherhood",
      rating: 9.1,
      year: 2009,
      episodes: 64,
      description:
        "Os irmãos alquimistas Edward e Alphonse Elric embarcam em uma jornada para restaurar seus corpos após uma malfadada tentativa de trazer sua mãe de volta à vida, descobrindo uma vasta conspiração militar no processo.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/5OadJ1sR4t09d2M5h4E90vL9Y84.jpg",
    },
    {
      id: 2,
      title: "Steins;Gate",
      rating: 9.0,
      year: 2011,
      episodes: 24,
      description:
        "Um grupo de amigos em Akihabara transforma acidentalmente um micro-ondas em um dispositivo que pode enviar mensagens de texto para o passado, levando a consequências que alteram drasticamente o presente e o futuro.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/oE8C5j1xQhVwzF7wYjX2b8m3yE8.jpg",
    },
    {
      id: 3,
      title: "Attack on Titan",
      rating: 9.1,
      year: 2013,
      episodes: 89,
      description:
        "A humanidade se esconde atrás de enormes muralhas para se proteger de gigantes devoradores de homens conhecidos como Titãs. O jovem Eren Yeager jura exterminar todos eles após um desastre.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/o0KxK2n0t7X9YnFvA1v2N2t6G3G.jpg",
    },
    {
      id: 4,
      title: "Cowboy Bebop",
      rating: 8.7,
      year: 1998,
      episodes: 26,
      description:
        'No ano de 2071, um grupo de caçadores de recompensas que viajam no "Bebop", sua espaçonave, buscam criminosos por todo o sistema solar, enfrentando seu passado ao longo do caminho.',
      thumbnail:
        "https://image.tmdb.org/t/p/w500/l2IqJ6I4gYf80W5R9vG91e1lT7X.jpg",
    },
    {
      id: 5,
      title: "Neon Genesis Evangelion",
      rating: 8.5,
      year: 1995,
      episodes: 26,
      description:
        "O jovem Shinji Ikari é recrutado pela organização NERV para pilotar uma bio-máquina gigante, um Evangelion, e lutar contra seres monstruosos conhecidos como Anjos em um cenário pós-apocalíptico.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/q3jA7y7Wl77eYh1LhO0J5wFm1G7.jpg",
    },
    {
      id: 6,
      title: "Death Note",
      rating: 8.6,
      year: 2006,
      episodes: 37,
      description:
        "Um estudante genial chamado Light Yagami encontra um caderno sobrenatural que lhe permite matar qualquer pessoa cujo nome ele escreva, e decide usá-lo para livrar o mundo do mal como o vigilante 'Kira'.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/dK3fR18g1iEoy0oF6K8s4Yh5vJg.jpg",
    },
    {
      id: 7,
      title: "Hunter x Hunter (2011)",
      rating: 9.1,
      year: 2011,
      episodes: 148,
      description:
        "Gon Freecss sai em uma jornada para fazer o Exame Hunter e encontrar seu pai, um lendário Hunter. No caminho, ele faz amigos e enfrenta perigos para realizar seu sonho.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/8gR5Jk4F8r6f1S2hP91Y2w0t3r3.jpg",
    },
    {
      id: 8,
      title: "Monster",
      rating: 8.7,
      year: 2004,
      episodes: 74,
      description:
        "O Dr. Kenzo Tenma, um neurocirurgião japonês, arrisca sua carreira para salvar um menino, apenas para descobrir anos depois que o menino se tornou um serial killer e o monstro que ele criou.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/8Xo9nE1Xg5h3Yq81Z60c7sT4WqK.jpg",
    },
    {
      id: 9,
      title: "Vinland Saga",
      rating: 8.8,
      year: 2019,
      episodes: 48,
      description:
        "Na Islândia do século XI, o jovem Thorfinn jura vingança contra Askeladd, o líder mercenário que matou seu pai, e se junta ao seu bando de vikings para desafiá-lo em um duelo.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/fTjF7gG5YwQ1p2E5g0WjY4k3v8w.jpg",
    },
    {
      id: 10,
      title: "Jujutsu Kaisen",
      rating: 8.6,
      year: 2020,
      episodes: 47,
      description:
        "Yuji Itadori se junta a um clube de ocultismo, encontra um objeto amaldiçoado e o engole para salvar seus amigos, tornando-se o hospedeiro de uma poderosa Maldição e entrando no mundo dos Feiticeiros Jujutsu.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/2GtrgN13h0r0L6Bw8hN9b43hFz2.jpg",
    },
    {
      id: 11,
      title: "Demon Slayer: Kimetsu no Yaiba",
      rating: 8.6,
      year: 2019,
      episodes: 55,
      description:
        "Após sua família ser massacrada por um demônio e sua irmã Nezuko ser transformada em uma, Tanjiro Kamado se junta ao Demon Slayer Corps para vingar sua família e encontrar a cura para Nezuko.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/8R1pB83t5Dk0n20R87r9i9H8iN8.jpg",
    },
  ],
  movies: [
    {
      id: 101,
      title: "Spider-Man: No Way Home",
      rating: 8.7,
      year: 2021,
      duration: "148 min",
      description:
        "Peter Parker tem sua identidade revelada e pede ajuda ao Doutor Estranho, causando uma ruptura no multiverso.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
      video: "https://www.youtube.com/embed/JfVOs4VSpmA",
      videoType: "youtube",
      streamingLinks: {
        netflix: "https://www.netflix.com/title/81588449",
        amazon: "https://www.amazon.com/gp/video/detail/B09PKDRX2T",
      },
    },
    {
      id: 102,
      title: "Avengers: Endgame",
      rating: 9.1,
      year: 2019,
      duration: "181 min",
      description:
        "Os Vingadores restantes se unem para uma última batalha épica contra Thanos e reverter o estalar de dedos.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
      video: "https://www.youtube.com/embed/TcMBFSGVi1c",
      videoType: "youtube",
      streamingLinks: {
        disneyplus:
          "https://www.disneyplus.com/movies/avengers-endgame/aRbVJUb2h2Rf",
      },
    },
    {
      id: 103,
      title: "The Batman",
      rating: 8.9,
      year: 2022,
      duration: "176 min",
      description:
        "Bruce Wayne investiga a corrupção em Gotham City enquanto enfrenta o Charada, um serial killer enigmático.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
      video: "https://www.youtube.com/embed/mqqft2x_Aa4",
      videoType: "youtube",
      streamingLinks: {
        hbomax: "https://www.max.com/movies/the-batman/",
      },
    },
    {
      id: 104,
      title: "Top Gun: Maverick",
      rating: 8.8,
      year: 2022,
      duration: "131 min",
      description:
        "Pete 'Maverick' Mitchell retorna após 30 anos de serviço para treinar uma nova geração de pilotos para uma missão impossível.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
      video: "https://www.youtube.com/embed/giXco2jaZ_4",
      videoType: "youtube",
      streamingLinks: {
        paramount: "https://www.paramountplus.com/movies/top-gun-maverick/",
      },
    },
  ],

  series: [
    {
      id: 201,
      title: "The Last of Us",
      rating: 9.4,
      year: 2023,
      seasons: 1,
      episodes: 9,
      description:
        "Joel e Ellie atravessam os Estados Unidos pós-apocalíptico, 20 anos após uma pandemia devastadora causada por fungos.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg",
      video: "https://www.youtube.com/embed/uLtkt8BonwM",
      videoType: "youtube",
      streamingLinks: {
        hbomax: "https://www.max.com/series/the-last-of-us/",
      },
    },
    {
      id: 202,
      title: "Stranger Things",
      rating: 9.0,
      year: 2016,
      seasons: 4,
      episodes: 42,
      description:
        "Um grupo de crianças em Hawkins, Indiana, descobre experimentos secretos do governo e forças sobrenaturais.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/49WJfeN0moxb9IPfGn8AIqMGskD.jpg",
      video: "https://www.youtube.com/embed/b9EkMc79ZSU",
      videoType: "youtube",
      streamingLinks: {
        netflix: "https://www.netflix.com/title/80057281",
      },
    },
    {
      id: 203,
      title: "The Witcher",
      rating: 8.8,
      year: 2019,
      seasons: 3,
      episodes: 24,
      description:
        "Geralt de Rívia, um caçador de monstros solitário, luta para encontrar seu lugar em um mundo onde humanos são mais cruéis que bestas.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/7vjaCdMw15FEbXyLQTVa04URsPm.jpg",
      video: "https://www.youtube.com/embed/ndl1W4ltcmg",
      videoType: "youtube",
      streamingLinks: {
        netflix: "https://www.netflix.com/title/80189685",
      },
    },
    {
      id: 204,
      title: "Wednesday",
      rating: 8.7,
      year: 2022,
      seasons: 1,
      episodes: 8,
      description:
        "Wednesday Addams investiga assassinatos enquanto tenta controlar seus poderes psíquicos emergentes na Academia Nevermore.",
      thumbnail:
        "https://image.tmdb.org/t/p/w500/9PFonBhy4cQy7Jz20NpMygczOkv.jpg",
      video: "https://www.youtube.com/embed/Di310WS8zLk",
      videoType: "youtube",
      streamingLinks: {
        netflix: "https://www.netflix.com/title/81231974",
      },
    },
  ],
};

let currentUser = null;
let currentSubscription = null;

// ========== FUNÇÕES DE CLIQUES ==========

function getClickCount(contentId) {
  const clicks = JSON.parse(localStorage.getItem("content_clicks") || "{}");
  return clicks[contentId] || 0;
}

function incrementClickCount(contentId) {
  const clicks = JSON.parse(localStorage.getItem("content_clicks") || "{}");
  clicks[contentId] = (clicks[contentId] || 0) + 1;
  localStorage.setItem("content_clicks", JSON.stringify(clicks));
  return clicks[contentId];
}

// ========== FUNÇÕES DE FAVORITOS ==========

function getFavorites() {
  return JSON.parse(localStorage.getItem("user_favorites") || "[]");
}

function isFavorite(contentId) {
  const favorites = getFavorites();
  return favorites.includes(contentId);
}

function toggleFavorite(contentId, event) {
  if (event) {
    event.stopPropagation();
  }

  const favorites = getFavorites();
  const index = favorites.indexOf(contentId);

  if (index === -1) {
    favorites.push(contentId);
    console.log(`⭐ Adicionado aos favoritos: ${contentId}`);
  } else {
    favorites.splice(index, 1);
    console.log(`💔 Removido dos favoritos: ${contentId}`);
  }

  localStorage.setItem("user_favorites", JSON.stringify(favorites));

  // Atualizar UI
  loadAllContent();
  loadContinueWatching();
}

function showFavorites() {
  const favorites = getFavorites();

  if (favorites.length === 0) {
    showFavoritesModal([]);
    return;
  }

  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  const favoriteContent = favorites
    .map((id) => allContent.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  showFavoritesModal(favoriteContent);
}

function showFavoritesModal(content) {
  // Criar modal se não existir
  let modal = document.getElementById("favorites-modal");

  if (!modal) {
    modal = document.createElement("div");
    modal.id = "favorites-modal";
    modal.className = "favorites-modal";
    document.body.appendChild(modal);
  }

  if (content.length === 0) {
    modal.innerHTML = `
      <div class="favorites-content">
        <div class="favorites-header">
          <h2>❤️ Meus Favoritos</h2>
          <button class="close-modal" onclick="closeFavoritesModal()">×</button>
        </div>
        <div class="empty-favorites">
          <h3>Nenhum favorito ainda</h3>
          <p>Clique no coração dos cards para adicionar aos favoritos!</p>
        </div>
      </div>
    `;
  } else {
    const cardsHTML = content
      .map((item) => {
        let type;
        if (contentDatabase.animes.includes(item)) type = "anime";
        else if (contentDatabase.movies.includes(item)) type = "movie";
        else type = "series";

        return createContentCard(item, type);
      })
      .join("");

    modal.innerHTML = `
      <div class="favorites-content">
        <div class="favorites-header">
          <h2>❤️ Meus Favoritos (${content.length})</h2>
          <button class="close-modal" onclick="closeFavoritesModal()">×</button>
        </div>
        <div class="favorites-grid">
          ${cardsHTML}
        </div>
      </div>
    `;
  }

  modal.classList.add("active");

  // Fechar ao clicar fora
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeFavoritesModal();
    }
  });
}

function closeFavoritesModal() {
  const modal = document.getElementById("favorites-modal");
  if (modal) {
    modal.classList.remove("active");
  }
}

// ========== INICIALIZAÇÃO ==========

document.addEventListener("DOMContentLoaded", async () => {
  await verifyUserAccess();
  loadAllContent();
  loadContinueWatching();

  // Adicionar evento ao email
  const userEmail = document.getElementById("user-email");
  if (userEmail) {
    userEmail.addEventListener("click", showFavorites);
    userEmail.title = "Clique para ver seus favoritos";
  }
});

// ========== VERIFICAÇÃO DE ACESSO ==========

async function verifyUserAccess() {
  try {
    currentUser = await checkAuth();

    if (!currentUser) {
      showAccessDenied();
      return;
    }

    currentSubscription = await checkSubscription(currentUser.id);

    if (!currentSubscription) {
      showAccessDenied();
      return;
    }

    document.getElementById("access-denied").style.display = "none";
    document.getElementById("premium-content").style.display = "block";

    document.getElementById("user-email").textContent = currentUser.email;
    document.getElementById("plan-badge").textContent =
      currentSubscription.plan_name;
    document.getElementById("sub-plan").textContent =
      currentSubscription.plan_name;

    const expiresAt = new Date(currentSubscription.expires_at);
    document.getElementById("sub-expires").textContent =
      expiresAt.toLocaleDateString("pt-BR");
  } catch (error) {
    console.error("❌ Erro ao verificar acesso:", error);
    showAccessDenied();
  }
}

function showAccessDenied() {
  document.getElementById("access-denied").style.display = "flex";
  document.getElementById("premium-content").style.display = "none";
}

// ========== CRIAÇÃO DE CARDS ==========

function createContentCard(item, type) {
  const isFav = isFavorite(item.id);

  return `
    <div class="content-card" onclick="playContent(${item.id}, '${type}')">
      <div class="card-image">
        <img src="${item.thumbnail}" alt="${item.title}" />
        <div class="card-overlay">
          <button class="play-btn">▶️ Assistir</button>
        </div>
        <div class="card-badge">⭐ ${item.rating}</div>
        <div class="card-clicks">👁️ ${getClickCount(item.id)}</div>
        <button class="card-favorite ${isFav ? "active" : ""}" 
                onclick="toggleFavorite(${item.id}, event)" 
                title="${
                  isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"
                }">
          ${isFav ? "❤️" : "🤍"}
        </button>
      </div>
      <div class="card-info">
        <h4 class="card-title">${item.title}</h4>
        <div class="card-meta">
          <span>${item.year}</span>
          ${
            item.episodes
              ? `<span>${item.episodes} eps</span>`
              : item.duration
              ? `<span>${item.duration}</span>`
              : ""
          }
        </div>
      </div>
    </div>
  `;
}

// ========== CARREGAMENTO DE CONTEÚDO ==========

function loadAllContent() {
  loadContentGrid("animes", contentDatabase.animes, "anime");
  loadContentGrid("movies", contentDatabase.movies, "movie");
  loadContentGrid("series", contentDatabase.series, "series");
}

function loadContentGrid(gridId, items, type) {
  const grid = document.getElementById(`${gridId}-grid`);
  if (!grid) return;

  grid.innerHTML = items.map((item) => createContentCard(item, type)).join("");
}

// ========== REPRODUÇÃO DE CONTEÚDO ==========

function playContent(contentId, type) {
  incrementClickCount(contentId);
  console.log(`📊 Conteúdo ${contentId} clicado`);
  window.location.href = `player.html?id=${contentId}&type=${type}`;
}

// ========== FILTROS E BUSCA ==========

function filterContent(category) {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  event.target.classList.add("active");

  const sections = document.querySelectorAll(".content-section");

  sections.forEach((section) => {
    if (category === "all") {
      section.style.display = "block";
    } else {
      const sectionCategory = section.getAttribute("data-category");
      section.style.display = sectionCategory === category ? "block" : "none";
    }
  });
}

function searchContent() {
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();

  if (searchTerm.length === 0) {
    loadAllContent();
    return;
  }

  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  const filtered = allContent.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm) ||
      item.description.toLowerCase().includes(searchTerm)
  );

  document.getElementById("animes-grid").innerHTML = "";
  document.getElementById("movies-grid").innerHTML = "";
  document.getElementById("series-grid").innerHTML = "";

  filtered.forEach((item) => {
    let type, gridId;

    if (contentDatabase.animes.includes(item)) {
      type = "anime";
      gridId = "animes-grid";
    } else if (contentDatabase.movies.includes(item)) {
      type = "movie";
      gridId = "movies-grid";
    } else {
      type = "series";
      gridId = "series-grid";
    }

    const grid = document.getElementById(gridId);
    grid.innerHTML += createContentCard(item, type);
  });

  if (filtered.length === 0) {
    document.getElementById("animes-grid").innerHTML =
      '<p style="color: #9ca3af; padding: 20px; grid-column: 1/-1; text-align: center;">Nenhum resultado encontrado.</p>';
  }
}

// ========== CONTINUE ASSISTINDO ==========

function loadContinueWatching() {
  const continueGrid = document.getElementById("continue-grid");
  if (!continueGrid) return;

  const savedProgress = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);

    if (key.startsWith("progress_")) {
      try {
        const progress = JSON.parse(localStorage.getItem(key));
        if (progress.percentage < 90 && progress.percentage > 5) {
          savedProgress.push(progress);
        }
      } catch (e) {
        console.error("Erro ao carregar progresso:", e);
      }
    }
  }

  savedProgress.sort(
    (a, b) => new Date(b.lastWatched) - new Date(a.lastWatched)
  );

  if (savedProgress.length === 0) {
    continueGrid.innerHTML =
      '<p style="color: #9ca3af; padding: 20px; grid-column: 1/-1; text-align: center;">Nenhum conteúdo em andamento.</p>';
    return;
  }

  const allContent = [
    ...contentDatabase.animes,
    ...contentDatabase.movies,
    ...contentDatabase.series,
  ];

  continueGrid.innerHTML = savedProgress
    .slice(0, 6)
    .map((progress) => {
      const content = allContent.find((c) => c.id === progress.contentId);
      if (!content) return "";

      let type;
      if (contentDatabase.animes.includes(content)) type = "anime";
      else if (contentDatabase.movies.includes(content)) type = "movie";
      else type = "series";

      const isFav = isFavorite(content.id);

      return `
      <div class="content-card" onclick="playContent(${content.id}, '${type}')">
        <div class="card-image">
          <img src="${content.thumbnail}" alt="${content.title}" />
          <div class="card-overlay">
            <button class="play-btn">▶️ Continuar</button>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${
              progress.percentage
            }%"></div>
          </div>
          <div class="card-clicks">👁️ ${getClickCount(content.id)}</div>
          <button class="card-favorite ${isFav ? "active" : ""}" 
                  onclick="toggleFavorite(${content.id}, event)" 
                  title="${
                    isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"
                  }">
            ${isFav ? "❤️" : "🤍"}
          </button>
        </div>
        <div class="card-info">
          <h4 class="card-title">${content.title}</h4>
          <div class="card-meta">
            <span>${Math.floor(progress.percentage)}% assistido</span>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// ========== LOGOUT ==========

async function logout() {
  if (confirm("Deseja realmente sair?")) {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("❌ Erro ao fazer logout:", error);
      alert("Erro ao fazer logout!");
      return;
    }

    window.location.href = "login.html";
  }
}
