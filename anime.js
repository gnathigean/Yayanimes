// anime.js - Página de detalhes do anime com lista de episódios

let currentAnimeId = null;
let currentAnimeTitle = null;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  console.log("🎬 Iniciando página de anime...");

  // Pega parâmetros da URL
  const params = new URLSearchParams(window.location.search);
  currentAnimeId = params.get("id");
  currentAnimeTitle = params.get("title");

  if (!currentAnimeId) {
    alert("❌ ID do anime não encontrado!");
    window.location.href = "content.html";
    return;
  }

  console.log(`📺 Carregando anime: ${currentAnimeId}`);

  try {
    await loadAnimeDetails();
    await loadEpisodes();
  } catch (error) {
    console.error("❌ Erro ao carregar anime:", error);
    alert("Erro ao carregar dados do anime");
  }
}

async function loadAnimeDetails() {
  const header = document.getElementById("anime-header");
  header.innerHTML = "<p>Carregando informações...</p>";

  try {
    const response = await window.AnimeAPI.getAnimeInfo(currentAnimeId);

    if (response.success && response.data) {
      const anime = response.data;

      header.innerHTML = `
                <img src="${anime.poster || anime.cover || "/placeholder.jpg"}" 
                     alt="${anime.name || currentAnimeTitle}" 
                     class="anime-cover">
                <div class="anime-details">
                    <h1>${
                      anime.name || decodeURIComponent(currentAnimeTitle)
                    }</h1>
                    <div class="anime-meta">
                        <span>⭐ ${anime.rating || "N/A"}</span>
                        <span>📅 ${anime.releaseDate || "N/A"}</span>
                        <span>📺 ${anime.type || "TV"}</span>
                        <span>🎬 ${anime.status || "Em exibição"}</span>
                    </div>
                    <p>${anime.description || "Sem descrição disponível."}</p>
                </div>
            `;
    }
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    header.innerHTML = `<p>❌ Erro ao carregar informações do anime</p>`;
  }
}

async function loadEpisodes() {
  const grid = document.getElementById("episodes-grid");
  grid.innerHTML = "<p>⏳ Carregando episódios...</p>";

  try {
    const response = await window.AnimeAPI.getEpisodes(currentAnimeId);

    console.log("📋 Episódios recebidos:", response);

    if (response.success && response.data && response.data.length > 0) {
      grid.innerHTML = "";

      response.data.forEach((episode) => {
        const card = createEpisodeCard(episode);
        grid.appendChild(card);
      });

      console.log(`✅ ${response.data.length} episódios carregados`);
    } else {
      grid.innerHTML = "<p>❌ Nenhum episódio disponível</p>";
    }
  } catch (error) {
    console.error("❌ Erro ao carregar episódios:", error);
    grid.innerHTML = "<p>❌ Erro ao carregar episódios</p>";
  }
}

function createEpisodeCard(episode) {
  const card = document.createElement("div");
  card.className = "episode-card";

  card.innerHTML = `
        <div class="episode-number">EP ${episode.number}</div>
        <div class="episode-title">${
          episode.title || `Episódio ${episode.number}`
        }</div>
    `;

  card.onclick = () => playEpisode(episode);

  return card;
}

function playEpisode(episode) {
  console.log(`▶️ Abrindo episódio ${episode.number}:`, episode);

  // Redireciona para player.html com episodeId
  const episodeId = episode.episodeId || episode.id;
  window.location.href = `player.html?episodeId=${episodeId}&animeTitle=${encodeURIComponent(
    currentAnimeTitle
  )}&episodeNumber=${episode.number}`;
}
