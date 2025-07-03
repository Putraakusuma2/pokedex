// Region index boundaries (Pokédex number, 1-based)
const regionRanges = {
  kanto:   [1, 151],
  johto:   [152, 251],
  hoenn:   [252, 386],
  sinnoh:  [387, 493],
  unova:   [494, 649],
  kalos:   [650, 721],
  alola:   [722, 809],
  galar:   [810, 905],
};
const typeColors = {
  fire: "bg-gradient-to-r from-orange-500 to-yellow-400 text-white border-orange-300",
  water: "bg-gradient-to-r from-blue-500 to-cyan-400 text-white border-cyan-300",
  grass: "bg-gradient-to-r from-green-500 to-lime-400 text-white border-green-300",
  electric: "bg-gradient-to-r from-yellow-400 to-yellow-200 text-black border-yellow-300",
  normal: "bg-gradient-to-r from-gray-400 to-gray-300 text-white border-gray-300",
  poison: "bg-gradient-to-r from-purple-500 to-fuchsia-400 text-white border-purple-300",
  bug: "bg-gradient-to-r from-lime-600 to-green-400 text-white border-lime-300",
  ground: "bg-gradient-to-r from-yellow-700 to-yellow-500 text-white border-yellow-400",
  flying: "bg-gradient-to-r from-indigo-400 to-blue-200 text-white border-indigo-300",
  psychic: "bg-gradient-to-r from-pink-500 to-pink-300 text-white border-pink-300",
  rock: "bg-gradient-to-r from-yellow-800 to-yellow-600 text-white border-yellow-700",
  ghost: "bg-gradient-to-r from-indigo-800 to-indigo-400 text-white border-indigo-300",
  dragon: "bg-gradient-to-r from-indigo-600 to-blue-400 text-white border-indigo-300",
  dark: "bg-gradient-to-r from-gray-800 to-gray-600 text-white border-gray-500",
  steel: "bg-gradient-to-r from-gray-500 to-gray-300 text-white border-gray-400",
  fairy: "bg-gradient-to-r from-pink-300 to-pink-100 text-black border-pink-200"
};


let allPokemon = [];


// IndexedDB setup for pokemon cache and favorites
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open('pokedexDB', 3);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      db = event.target.result;
      if (!db.objectStoreNames.contains('pokemon')) {
        db.createObjectStore('pokemon', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('favorites')) {
        db.createObjectStore('favorites', { keyPath: 'id' });
      }
    };
  });
}

function savePokemonToCache(pokemonList) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pokemon', 'readwrite');
    const store = tx.objectStore('pokemon');
    pokemonList.forEach(p => store.put(p));
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

function getAllCachedPokemon() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pokemon', 'readonly');
    const store = tx.objectStore('pokemon');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// FAVORITE STORE
function addFavorite(pokemon) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('favorites', 'readwrite');
    const store = tx.objectStore('favorites');
    store.put(pokemon);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function removeFavorite(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('favorites', 'readwrite');
    const store = tx.objectStore('favorites');
    store.delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
function getAllFavorites() {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('favorites', 'readonly');
    const store = tx.objectStore('favorites');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function fetchAllPokemon() {
  // Jika offline, ambil dari cache IndexedDB
  if (!navigator.onLine) {
    const cached = await getAllCachedPokemon();
    renderPokemons(cached);
    return cached;
  }
  // Online: fetch dari API, lalu simpan ke cache
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1008');
  const data = await res.json();
  const batchSize = 30;
  let detailed = [];
  for (let i = 0; i < data.results.length; i += batchSize) {
    const batch = data.results.slice(i, i + batchSize);
    const batchDetails = await Promise.all(
      batch.map(p => fetch(p.url).then(r => r.json()))
    );
    detailed = detailed.concat(batchDetails);
    renderPokemons(detailed); // Progressive render for better UX
    // Simpan batch ke cache agar progresif
    await savePokemonToCache(batchDetails);
  }
  return detailed;
}

function renderPokemons(pokemonList) {
  const container = document.getElementById("pokemon-container");
  const searchInput = document.getElementById("searchInput");
  const regionSelect = document.getElementById("regionSelect");
  container.innerHTML = "";
  if (!pokemonList || !Array.isArray(pokemonList) || pokemonList.length === 0) {
    container.innerHTML = '<div class="flex items-center justify-center min-h-[320px] w-full"><div class="text-cyan-200 text-center text-lg font-semibold bg-[#23243a] bg-opacity-80 rounded-xl shadow-lg px-8 py-8 border border-cyan-700">Tidak ada data Pokémon yang ditemukan.</div></div>';
    console.warn('Pokemon list kosong atau tidak valid:', pokemonList);
    return;
  }
  const search = searchInput.value.toLowerCase();

  // Urutan filter: region -> type -> search -> favorite
  let filtered = pokemonList;

  // Filter by region if not 'all'
  if (regionSelect && regionSelect.value !== 'all') {
    const [start, end] = regionRanges[regionSelect.value];
    filtered = filtered.filter(p => p && p.id >= start && p.id <= end);
  }

  // Filter by type if not 'all' (icon button version, strictly use t.type.name)
  const typeFilter = document.getElementById('typeFilter');
  let selectedType = 'all';
  if (typeFilter) {
    const activeBtn = typeFilter.querySelector('.type-btn.active');
    if (activeBtn) selectedType = activeBtn.getAttribute('data-type');
  }
  if (selectedType !== 'all') {
    filtered = filtered.filter(p => Array.isArray(p.types) && p.types.some(t => t.type && t.type.name === selectedType));
  }

  // Filter by search
  if (search) {
    filtered = filtered.filter(p => p && p.name && typeof p.name === 'string' && p.name.toLowerCase().includes(search));
  }

  // Filter by favorite if active
  if (window.isFavoriteFilterActive && window.isFavoriteFilterActive()) {
    filtered = filtered.filter(p => window.favIds && window.favIds.has(p.id));
  }

  if (!filtered || filtered.length === 0) {
    container.innerHTML = '<div class="flex items-center justify-center min-h-[320px] w-full"><div class="text-cyan-200 text-center text-lg font-semibold bg-[#23243a] bg-opacity-80 rounded-xl shadow-lg px-8 py-8 border border-cyan-700">Tidak ada Pokémon yang cocok dengan filter pencarian.</div></div>';
    console.warn('Hasil filter kosong:', {search, selectedType, region: regionSelect && regionSelect.value, pokemonList});
    return;
  }

  filtered.forEach(pokemon => {
    // Validasi lebih toleran: hanya skip jika null/undefined atau tidak ada id/nama
    if (!pokemon || typeof pokemon !== 'object' || !pokemon.id || !pokemon.name) return;
    if (!pokemon.sprites || !pokemon.types || !Array.isArray(pokemon.types)) {
      console.warn('Data Pokémon tidak lengkap, skip:', pokemon);
      return;
    }

    const card = document.createElement("div");
    card.className = `relative bg-gradient-to-br from-[#23243a] to-[#18192a] rounded-[2.2rem] border-2 border-blue-400/90 shadow-[0_0_48px_10px_rgba(0,180,255,0.22)] hover:scale-105 transition cursor-pointer flex flex-col items-stretch p-0 min-h-[370px] max-h-[410px] w-full max-w-[98vw] sm:max-w-[295px] mx-auto overflow-hidden before:content-[''] before:absolute before:inset-0 before:rounded-[2.2rem] before:shadow-[0_0_60px_16px_rgba(0,180,255,0.13)]`;

    // --- FLEXIBLE BACKGROUND CIRCLE ---
    // Fungsi utilitas untuk style background bulat (global, agar bisa dipakai di luar fungsi render)
    if (typeof window.getCircleBgStyle !== 'function') {
      window.getCircleBgStyle = function getCircleBgStyle({
        size = 320, // px
        x = '50%',
        y = '38%',
        opacity = 0.25,
        image = "images/background.svg",
        scale = 1,
        position 
      } = {}) {
        // Support legacy position/scale
        let top = y, left = x;
        if (position === 'top') { top = '18%'; } else if (position === 'bottom') { top = '82%'; } else if (position === 'center' || !y) { top = '50%'; }
        // Style string
        return `left:${left};top:${top};width:${size}px;height:${size}px;opacity:${opacity};background-image:url('${image}');transform:translate(-50%\,-33%) scale(${scale});`;
      }
    }

    // Konfigurasi default, bisa diubah global atau per region/type
    const globalBgCircleConfig = window.bgCircleConfig || { size: 320, x: '50%', y: '38%', opacity: 0.25, image: 'images/background.svg' };
    // Per kartu bisa override via pokemon.bgCircle
    let cardBgCircleConfig = Object.assign({}, globalBgCircleConfig, pokemon.bgCircle || {});
    // Contoh variasi: jika pokemon legendary, lebih besar & terang
    if (pokemon.is_legendary || pokemon.base_experience > 300) {
      cardBgCircleConfig = { ...cardBgCircleConfig, size: 370, x: '52%', y: '36%', opacity: 0.33 };
    }
    // Contoh variasi: jika type water, lebih biru dan lebih transparan
    if (pokemon.types && pokemon.types.some(t => t.type && t.type.name === 'water')) {
      cardBgCircleConfig = { ...cardBgCircleConfig, opacity: 0.19 };
    }
    const circleBg = `<div class='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/3 rounded-full bg-no-repeat bg-center bg-cover z-0' style="${window.getCircleBgStyle(cardBgCircleConfig)}"></div>`;

    // Type badges EN (horizontal, besar, solid, bold, tanpa mb pada terakhir)
    const typeBadges = pokemon.types.map((t, idx) => {
      if (!t.type || !t.type.name) return '';
      const color = typeColors[t.type.name] || 'bg-gray-500';
      const label = t.type.name.charAt(0).toUpperCase() + t.type.name.slice(1);
      // Hilangkan mb-1 pada badge terakhir
      const mb = (idx === pokemon.types.length - 1) ? '' : 'mb-1';
      return `<span class="px-3 py-1 rounded-full font-bold text-sm shadow-md mr-2 ${mb} border ${color} drop-shadow-[0_2px_8px_rgba(0,180,255,0.18)]">${label}</span>`;
    }).join('');

    // Favorite button (star)
    const isFav = window.favIds && window.favIds.has(pokemon.id);
    const favBtn = `<button class="absolute top-3 right-3 z-20 bg-[#23243a] bg-opacity-80 rounded-full p-2 border-2 border-cyan-400 hover:bg-cyan-900/80 transition fav-btn" data-id="${pokemon.id}" title="${isFav ? 'Unfavorite' : 'Favorite'}">
      <svg class="w-6 h-6" fill="${isFav ? '#facc15' : 'none'}" stroke="#facc15" stroke-width="2" viewBox="0 0 24 24"><polygon points="12 2 15 9 22 9.3 17 14 18.5 21 12 17.5 5.5 21 7 14 2 9.3 9 9"/></svg>
    </button>`;

    card.innerHTML = `
      ${favBtn}
      <div class="flex flex-col items-center w-full pt-4 pb-3 px-0 relative">
        <div class="relative flex items-center justify-center w-full mt-7 mb-2" style="min-height:160px;">
          ${circleBg}
          <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="relative z-10 w-36 h-36 sm:w-40 sm:h-40 object-contain drop-shadow-2xl transition-all duration-300 scale-105 hover:scale-110" />
        </div>
        <div class="flex flex-col items-start w-full px-4 mt-1">
          <span class="font-mono text-cyan-100 text-lg font-extrabold tracking-[0.22em] drop-shadow-xl leading-none">${String(pokemon.id).padStart(4, '0')}</span>
          <p class="font-extrabold text-xl sm:text-2xl text-cyan-100 capitalize tracking-wide z-10 text-left w-full whitespace-nowrap overflow-hidden text-ellipsis text-shadow-lg leading-none">${pokemon.name}</p>
        </div>
        <div class="flex flex-row justify-center items-center gap-2 z-10 w-full mt-4 pb-2 px-10 md:px-16">${typeBadges}</div>
      </div>
    `;
    card.querySelector('.fav-btn').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.favIds && window.favIds.has(pokemon.id)) {
        await removeFavorite(pokemon.id);
        window.favIds.delete(pokemon.id);
      } else {
        await addFavorite(pokemon);
        window.favIds.add(pokemon.id);
      }
      renderPokemons(allPokemon);
      window.renderFavoritesDrawer && window.renderFavoritesDrawer();
    });
    card.onclick = () => {
      window.location.href = `detail.html?id=${pokemon.id}`;
    };
    container.appendChild(card);
  });
// Render favorites drawer
window.renderFavoritesDrawer = async function renderFavoritesDrawer() {
  const favList = document.getElementById('fav-list');
  if (!favList) return;
  const favs = await getAllFavorites();
  favList.innerHTML = '';
  if (!favs.length) {
    favList.innerHTML = '<div class="text-cyan-200 text-center">Belum ada Pokémon favorit.</div>';
    return;
  }
  favs.forEach(pokemon => {
    const item = document.createElement('div');
    item.className = 'flex items-center gap-3 bg-[#18192a] rounded-xl p-2 border border-cyan-900 shadow';
    item.innerHTML = `
      <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-12 h-12 object-contain rounded-full bg-[#23243a] border border-cyan-400" />
      <div class="flex-1 text-left">
        <div class="font-bold text-cyan-200 text-base capitalize">${pokemon.name}</div>
        <div class="text-xs text-cyan-400 font-mono">#${String(pokemon.id).padStart(4, '0')}</div>
      </div>
      <button class="unfav-btn text-yellow-400 hover:text-red-400 text-xl font-bold p-1" title="Hapus dari favorit" data-id="${pokemon.id}">&times;</button>
    `;
    item.querySelector('.unfav-btn').onclick = async (e) => {
      e.stopPropagation();
      await removeFavorite(pokemon.id);
      window.favIds.delete(pokemon.id);
      window.renderFavoritesDrawer();
      renderPokemons(allPokemon);
    };
    item.onclick = () => showDialog(pokemon);
    favList.appendChild(item);
  });
}
}

const overlayEl = document.getElementById("overlay");
const dialogEl = document.getElementById("dialog");
if (overlayEl && dialogEl) {
  overlayEl.onclick = () => {
    dialogEl.classList.add("hidden");
    overlayEl.classList.add("hidden");
  };
}

document.getElementById("searchInput").addEventListener("input", () => renderPokemons(allPokemon));
const regionSelect = document.getElementById("regionSelect");
if (regionSelect) {
  regionSelect.addEventListener("change", () => renderPokemons(allPokemon));
}

// Type filter icon button event
const typeFilter = document.getElementById("typeFilter");
if (typeFilter) {
  typeFilter.addEventListener("click", (e) => {
    let btn = e.target;
    while (btn && !btn.classList.contains("type-btn") && btn !== typeFilter) {
      btn = btn.parentElement;
    }
    if (btn && btn.classList.contains("type-btn")) {
      const isActive = btn.classList.contains('active');
      // Jika sudah aktif, reset ke 'all'
      typeFilter.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active', 'ring-2', 'ring-cyan-400'));
      if (!isActive) {
        btn.classList.add('active', 'ring-2', 'ring-cyan-400');
      } else {
        // Aktifkan tombol 'all' jika ada
        const btnAll = typeFilter.querySelector('[data-type="all"]');
        if (btnAll) btnAll.classList.add('active', 'ring-2', 'ring-cyan-400');
      }
      renderPokemons(allPokemon);
    }
  });
  // Set default active
  const btnAll = typeFilter.querySelector('[data-type="all"]');
  if (btnAll) btnAll.classList.add('active', 'ring-2', 'ring-cyan-400');
}

// Initial load with IndexedDB and favorites
window.favIds = new Set();
window.addEventListener('DOMContentLoaded', () => {
  openDB().then(async () => {
    // Load favorites first
    const favs = await getAllFavorites();
    window.favIds = new Set(favs.map(f => f.id));
    fetchAllPokemon().then(pokemons => {
      allPokemon = pokemons;
      renderPokemons(allPokemon);
      renderFavoritesDrawer();
    }).catch(e => {
      const container = document.getElementById("pokemon-container");
      container.innerHTML = '<div class="text-red-400 text-center p-6">Gagal memuat data Pokémon.<br>' + e + '</div>';
    });
  }).catch(e => {
    const container = document.getElementById("pokemon-container");
    container.innerHTML = '<div class="text-red-400 text-center p-6">Gagal inisialisasi database.<br>' + e + '</div>';
  });
});
