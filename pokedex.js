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
  fire: "bg-orange-500", water: "bg-blue-500", grass: "bg-green-500", electric: "bg-yellow-400 text-black",
  normal: "bg-gray-400", poison: "bg-purple-500", bug: "bg-lime-600", ground: "bg-yellow-700",
  flying: "bg-indigo-400", psychic: "bg-pink-500", rock: "bg-yellow-800", ghost: "bg-indigo-800",
  dragon: "bg-indigo-600", dark: "bg-gray-800", steel: "bg-gray-500", fairy: "bg-pink-300 text-black"
};

let allPokemon = [];


async function fetchAllPokemon() {
  // Get all pokemon names (limit 1008 for Gen 9, adjust if needed)
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1008');
  const data = await res.json();
  // Fetch details in batches for performance
  const batchSize = 30;
  let detailed = [];
  for (let i = 0; i < data.results.length; i += batchSize) {
    const batch = data.results.slice(i, i + batchSize);
    const batchDetails = await Promise.all(
      batch.map(p => fetch(p.url).then(r => r.json()))
    );
    detailed = detailed.concat(batchDetails);
    renderPokemons(detailed); // Progressive render for better UX
  }
  return detailed;
}

function renderPokemons(pokemonList) {
  const container = document.getElementById("pokemon-container");
  const searchInput = document.getElementById("searchInput");
  const regionSelect = document.getElementById("regionSelect");
  container.innerHTML = "";
  const search = searchInput.value.toLowerCase();
  let filtered = pokemonList.filter(p => p.name.includes(search));

  // Filter by region if not 'all'
  if (regionSelect && regionSelect.value !== 'all') {
    const [start, end] = regionRanges[regionSelect.value];
    filtered = filtered.filter(p => p.id >= start && p.id <= end);
  }

  filtered.forEach(pokemon => {
    const card = document.createElement("div");
    card.className = "bg-gradient-to-br from-white to-pink-100 p-4 rounded-xl text-center shadow-lg border-2 border-red-100 hover:scale-105 hover:border-red-400 transition cursor-pointer flex flex-col items-center relative";
    card.innerHTML = `
      <span class="absolute left-3 top-3 text-xs font-bold text-red-500 bg-white bg-opacity-80 rounded px-2 py-0.5 shadow-sm">#${pokemon.id}</span>
      <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="w-24 h-24 mb-2 bg-white rounded-full p-2 border-2 border-red-100 shadow" />
      <p class="font-bold text-lg text-gray-800 capitalize tracking-wide">${pokemon.name}</p>
    `;
    card.onclick = () => showDialog(pokemon);
    container.appendChild(card);
  });
}

function showDialog(pokemon) {
  const pokeName = document.getElementById("poke-name");
  pokeName.textContent = pokemon.name;
  pokeName.className = "text-2xl sm:text-3xl font-extrabold text-red-700 mb-2 capitalize tracking-wide drop-shadow";
  document.getElementById("poke-img").src = pokemon.sprites.other["official-artwork"].front_default;
  document.getElementById("poke-height").textContent = pokemon.height;
  document.getElementById("poke-weight").textContent = pokemon.weight;

  // Tambahan detail: ID, Base Experience, Ability utama
  let extraInfo = document.getElementById("poke-extra");
  if (!extraInfo) {
    extraInfo = document.createElement("div");
    extraInfo.id = "poke-extra";
    extraInfo.className = "mb-2 text-gray-700 text-xs sm:text-sm";
    const dialog = document.getElementById("dialog");
    dialog.insertBefore(extraInfo, document.getElementById("poke-types"));
  }
  const mainAbility = pokemon.abilities && pokemon.abilities.length > 0 ? pokemon.abilities[0].ability.name : "-";
  extraInfo.innerHTML = `
    <div><strong>Main Ability:</strong> ${mainAbility}</div>
    <div><strong>Base Exp:</strong> ${pokemon.base_experience}</div>
  `;

  const typesDiv = document.getElementById("poke-types");
  typesDiv.innerHTML = "";
  // Type icon SVGs
  const typeIcons = {
    normal: '<svg class="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" stroke="#A8A878" fill="#A8A878"/></svg>',
    fire: '<svg class="inline w-4 h-4 mr-1" fill="#F08030" viewBox="0 0 24 24"><path d="M12 2C12 2 7 8 7 13a5 5 0 0010 0c0-5-5-11-5-11z"/></svg>',
    water: '<svg class="inline w-4 h-4 mr-1" fill="#6890F0" viewBox="0 0 24 24"><path d="M12 2C12 2 5 12 5 16a7 7 0 0014 0c0-4-7-14-7-14z"/></svg>',
    electric: '<svg class="inline w-4 h-4 mr-1" fill="#F8D030" viewBox="0 0 24 24"><polygon points="13 2 2 14 12 14 11 22 22 10 12 10 13 2"/></svg>',
    grass: '<svg class="inline w-4 h-4 mr-1" fill="#78C850" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="10"/></svg>',
    ice: '<svg class="inline w-4 h-4 mr-1" fill="#98D8D8" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
    fighting: '<svg class="inline w-4 h-4 mr-1" fill="#C03028" viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="4"/></svg>',
    poison: '<svg class="inline w-4 h-4 mr-1" fill="#A040A0" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="6"/></svg>',
    ground: '<svg class="inline w-4 h-4 mr-1" fill="#E0C068" viewBox="0 0 24 24"><ellipse cx="12" cy="16" rx="10" ry="4"/></svg>',
    flying: '<svg class="inline w-4 h-4 mr-1" fill="#A890F0" viewBox="0 0 24 24"><path d="M2 12l10 8 10-8-10-8-10 8z"/></svg>',
    psychic: '<svg class="inline w-4 h-4 mr-1" fill="#F85888" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>',
    bug: '<svg class="inline w-4 h-4 mr-1" fill="#A8B820" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="6" ry="8"/></svg>',
    rock: '<svg class="inline w-4 h-4 mr-1" fill="#B8A038" viewBox="0 0 24 24"><rect x="6" y="8" width="12" height="8" rx="3"/></svg>',
    ghost: '<svg class="inline w-4 h-4 mr-1" fill="#705898" viewBox="0 0 24 24"><ellipse cx="12" cy="14" rx="7" ry="5"/></svg>',
    dragon: '<svg class="inline w-4 h-4 mr-1" fill="#7038F8" viewBox="0 0 24 24"><path d="M12 2l4 8-4 8-4-8z"/></svg>',
    dark: '<svg class="inline w-4 h-4 mr-1" fill="#705848" viewBox="0 0 24 24"><ellipse cx="12" cy="12" rx="8" ry="5"/></svg>',
    steel: '<svg class="inline w-4 h-4 mr-1" fill="#B8B8D0" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
    fairy: '<svg class="inline w-4 h-4 mr-1" fill="#EE99AC" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/></svg>',
  };

  pokemon.types.forEach(t => {
    const span = document.createElement("span");
    span.className = `px-3 py-1 rounded-full text-white font-semibold text-sm shadow flex items-center gap-1 ${typeColors[t.type.name] || 'bg-gray-500'}`;
    span.innerHTML = `${typeIcons[t.type.name] || ''}<span>${t.type.name}</span>`;
    typesDiv.appendChild(span);
  });

  document.getElementById("dialog").classList.remove("hidden");
  document.getElementById("overlay").classList.remove("hidden");
}

document.getElementById("overlay").onclick = () => {
  document.getElementById("dialog").classList.add("hidden");
  document.getElementById("overlay").classList.add("hidden");
};


document.getElementById("searchInput").addEventListener("input", () => renderPokemons(allPokemon));
const regionSelect = document.getElementById("regionSelect");
if (regionSelect) {
  regionSelect.addEventListener("change", () => renderPokemons(allPokemon));
}


// Initial load
(async () => {
  allPokemon = await fetchAllPokemon();
  renderPokemons(allPokemon);
})();
