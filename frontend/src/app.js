// Estado global de la aplicación
let gamesData = [];
let summaryData = {};
let currentFilter = 'all'; // 'all', 'delisted', 'huge-margin', 'sold'
let currentSearch = '';
let currentSort = 'loss_desc';
let selectedGameId = null;

// Elementos del DOM
const gamesGrid = document.getElementById('games-grid');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

// Badges y Estadísticas
const tf2LiveBadge = document.getElementById('tf2-live-badge');
const tf2CashBadge = document.getElementById('tf2-cash-badge');

const statTotalGames = document.getElementById('stat-total-games');
const statTotalKeys = document.getElementById('stat-total-keys');
const statSteamValue = document.getElementById('stat-steam-value');
const statCashValue = document.getElementById('stat-cash-value');
const statMarketValue = document.getElementById('stat-market-value');
const statResellerProfit = document.getElementById('stat-reseller-profit');
const countDelisted = document.getElementById('count-delisted');
const countSold = document.getElementById('count-sold');

// Botones de filtro
const filterAll = document.getElementById('filter-all');
const filterDelisted = document.getElementById('filter-delisted');
const filterHugeMargin = document.getElementById('filter-huge-margin');
const filterSold = document.getElementById('filter-sold');

// Sincronización
const btnSyncSteam = document.getElementById('btn-sync-steam');
const syncProgressBar = document.getElementById('sync-progress-bar');
const syncProgressMsg = document.getElementById('sync-progress-msg');
const syncProgressFill = document.getElementById('sync-progress-fill');

// Modal de edición
const editModal = document.getElementById('edit-modal');
const modalTitle = document.getElementById('modal-game-title');
const modalGameImg = document.getElementById('modal-game-img');
const modalGameAppId = document.getElementById('modal-game-appid');
const editGameId = document.getElementById('edit-game-id');
const editSteamUrl = document.getElementById('edit-steam-url');
const editTf2Keys = document.getElementById('edit-tf2-keys');
const editKeyshopPrice = document.getElementById('edit-keyshop-price');
const editOfficialPrice = document.getElementById('edit-official-price');
const editHistKeyshop = document.getElementById('edit-hist-keyshop');
const editHistOfficial = document.getElementById('edit-hist-official');
const editLotName = document.getElementById('edit-lot-name');
const editIsSold = document.getElementById('edit-is-sold');
const editSoldCurrency = document.getElementById('edit-sold-currency');
const editSoldPrice = document.getElementById('edit-sold-price');
const editSoldCurrencyLabel = document.getElementById('edit-sold-currency-label');
const editSoldNote = document.getElementById('edit-sold-note');
const soldKeysContainer = document.getElementById('sold-keys-container');
const soldBadge = document.getElementById('sold-badge');
const editForm = document.getElementById('edit-form');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');

// Modal Añadir Juego
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const modalAddGame = document.getElementById('modal-add-game');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');
const btnCancelAdd = document.getElementById('btn-cancel-add');
const btnSubmitAdd = document.getElementById('btn-submit-add');
const inputSteamUrl = document.getElementById('input-steam-url');
const inputTf2Keys = document.getElementById('input-tf2-keys');
const inputLotName = document.getElementById('input-lot-name');

const FALLBACK_GAME_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIiBmaWxsPSIjMWUyOTNiIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iMzIiIHJ4PSI0Ii8+PHBhdGggZD0iTTI0IDEwaC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00di00em0xNCAyYTEuNSAxLjUgMCAxIDEtMyAwIDEuNSAxLjUgMCAwIDEgMyAwem00IDRhMS41IDEuNSAwIDEgMS0zIDAgMS41IDEuNSAwIDAgMSAzIDB6bS00IDRhMS41IDEuNSAwIDEgMS0zIDAgMS41IDEuNSAwIDAgMSAzIDB6bTQtOGExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMHoiIGZpbGw9IiM2NDc0OGIiLz48L3N2Zz4=";

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadSummary();
  await loadGames();
  checkSyncStatusLoop();
});

function setupEventListeners() {
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      loadGames();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      loadGames();
    });
  }

  if (filterAll) filterAll.addEventListener('click', () => setFilter('all'));
  if (filterDelisted) filterDelisted.addEventListener('click', () => setFilter('delisted'));
  if (filterHugeMargin) filterHugeMargin.addEventListener('click', () => setFilter('huge-margin'));
  if (filterSold) filterSold.addEventListener('click', () => setFilter('sold'));

  if (btnSyncSteam) {
    btnSyncSteam.addEventListener('click', async () => {
      btnSyncSteam.disabled = true;
      btnSyncSteam.classList.add('opacity-50');
      try {
        await fetch('/api/sync-steam', { method: 'POST' });
        if (syncProgressBar) syncProgressBar.classList.remove('hidden');
      } catch (err) {
        console.error("Error launching sync", err);
      }
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveModalData();
    });
  }

  if (editSoldCurrency) {
    editSoldCurrency.addEventListener('change', () => {
      const isEur = editSoldCurrency.value === 'EUR';
      if (editSoldCurrencyLabel) editSoldCurrencyLabel.textContent = isEur ? '€' : 'TF2';
      if (editSoldPrice) {
        editSoldPrice.step = isEur ? '0.01' : '0.25';
        editSoldPrice.placeholder = isEur ? '0.00' : '0.00';
      }
    });
  }

  if (editIsSold) {
    editIsSold.addEventListener('change', () => {
      if (soldKeysContainer) {
        if (editIsSold.checked) {
          soldKeysContainer.classList.remove('hidden');
          soldKeysContainer.classList.add('flex');
          if (soldBadge) soldBadge.classList.remove('hidden');
          if (editSoldPrice && !editSoldPrice.value) {
            const curGame = gamesData.find(g => g.id === selectedGameId);
            if (curGame) editSoldPrice.value = curGame.tf2_keys_offered;
          }
        } else {
          soldKeysContainer.classList.add('hidden');
          soldKeysContainer.classList.remove('flex');
          if (soldBadge) soldBadge.classList.add('hidden');
        }
      }
    });
  }

  // Modal Añadir Juego
  if (btnOpenAddModal && modalAddGame) {
    btnOpenAddModal.addEventListener('click', () => {
      if (inputSteamUrl) inputSteamUrl.value = '';
      if (inputTf2Keys) inputTf2Keys.value = '1.0';
      if (inputLotName) inputLotName.value = '';
      modalAddGame.classList.remove('hidden');
      modalAddGame.classList.add('flex');
    });

    const closeAddModal = () => {
      modalAddGame.classList.add('hidden');
      modalAddGame.classList.remove('flex');
    };

    if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
    if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

    if (btnSubmitAdd) {
      btnSubmitAdd.addEventListener('click', async () => {
        const url = inputSteamUrl ? inputSteamUrl.value.trim() : '';
        const keys = inputTf2Keys ? parseFloat(inputTf2Keys.value) : 1.0;
        const lot = inputLotName ? (inputLotName.value.trim() || 'xMjalino') : 'xMjalino';
        if (!url) return;

        btnSubmitAdd.disabled = true;
        btnSubmitAdd.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Añadiendo...`;
        try {
          const res = await fetch('/api/games/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ steam_url: url, tf2_keys_offered: keys, lot_name: lot })
          });
          if (res.ok) {
            closeAddModal();
            await loadSummary();
            await loadGames();
          }
        } catch (e) {
          console.error(e);
        } finally {
          btnSubmitAdd.disabled = false;
          btnSubmitAdd.innerHTML = `<i class="fa-solid fa-plus"></i> Añadir y Calcular`;
        }
      });
    }
  }
}

function setFilter(filter) {
  currentFilter = filter;
  [filterAll, filterDelisted, filterHugeMargin, filterSold].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  if (filter === 'all' && filterAll) {
    filterAll.classList.add('active');
  } else if (filter === 'delisted' && filterDelisted) {
    filterDelisted.classList.add('active');
  } else if (filter === 'huge-margin' && filterHugeMargin) {
    filterHugeMargin.classList.add('active');
  } else if (filter === 'sold' && filterSold) {
    filterSold.classList.add('active');
  }
  loadGames();
}

async function loadSummary() {
  try {
    const res = await fetch('/api/summary');
    summaryData = await res.json();

    if (tf2LiveBadge && typeof summaryData.tf2_steam_price === 'number') tf2LiveBadge.textContent = `${summaryData.tf2_steam_price.toFixed(2)} €`;
    if (tf2CashBadge && typeof summaryData.tf2_cash_price === 'number') tf2CashBadge.textContent = `${summaryData.tf2_cash_price.toFixed(2)} €`;

    if (statTotalGames) statTotalGames.textContent = summaryData.total_games || 0;
    
    // El pill de "Todos" refleja los juegos disponibles (no vendidos)
    const pill = document.getElementById('stat-total-games-pill');
    if (pill) pill.textContent = summaryData.available_count !== undefined ? summaryData.available_count : (summaryData.total_games || 0);
    
    if (statTotalKeys) statTotalKeys.textContent = summaryData.total_keys || 0;
    if (statSteamValue && typeof summaryData.total_offer_steam_eur === 'number') statSteamValue.textContent = `${summaryData.total_offer_steam_eur.toFixed(2)} €`;
    if (statCashValue && typeof summaryData.total_offer_cash_eur === 'number') statCashValue.textContent = `${summaryData.total_offer_cash_eur.toFixed(2)} €`;
    if (statMarketValue && typeof summaryData.total_market_value_eur === 'number') statMarketValue.textContent = `${summaryData.total_market_value_eur.toFixed(2)} €`;
    if (statResellerProfit && typeof summaryData.total_reseller_profit_eur === 'number') statResellerProfit.textContent = `+${summaryData.total_reseller_profit_eur.toFixed(2)} €`;
    
    if (countDelisted) countDelisted.textContent = summaryData.delisted_count || 0;
    
    const countSoldEl = document.getElementById('count-sold');
    if (countSoldEl) countSoldEl.textContent = summaryData.sold_count || 0;
  } catch (err) {
    console.error("Error loading summary", err);
  }
}

async function loadGames() {
  try {
    const res = await fetch('/api/games');
    gamesData = await res.json();
    renderGamesGrid();
  } catch (err) {
    console.error("Error loading games", err);
  }
}

function renderGamesGrid() {
  if (!gamesGrid) return;
  gamesGrid.innerHTML = '';

  let filtered = [...gamesData];

  // 1. Filtro de búsqueda
  if (currentSearch.trim() !== '') {
    const term = currentSearch.toLowerCase().trim();
    filtered = filtered.filter(g => g.name.toLowerCase().includes(term));
  }

  // 2. Filtros rápidos (Los vendidos quedan excluidos de Todos, Deslistados y Mayor Pérdida)
  if (currentFilter === 'all') {
    filtered = filtered.filter(g => !g.is_sold);
  } else if (currentFilter === 'delisted') {
    filtered = filtered.filter(g => g.is_delisted_steam && !g.is_sold);
  } else if (currentFilter === 'huge-margin') {
    filtered = filtered.filter(g => {
      if (g.is_sold) return false;
      const loss = typeof g.seller_loss_eur === 'number' ? g.seller_loss_eur : 0;
      const floor = typeof g.floor_price_eur === 'number' ? g.floor_price_eur : 0;
      if (floor <= 0) return false;
      const pct = (loss / floor) * 100;
      return pct >= 40.0;
    });
  } else if (currentFilter === 'sold') {
    filtered = filtered.filter(g => !!g.is_sold);
  }

  // 3. Ordenación
  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'loss_desc':
        return (b.seller_loss_eur || 0) - (a.seller_loss_eur || 0);
      case 'loss_asc':
        return (a.seller_loss_eur || 0) - (b.seller_loss_eur || 0);
      case 'loss_pct_desc':
        const pctA = (a.floor_price_eur > 0) ? ((a.seller_loss_eur || 0) / a.floor_price_eur) : -999;
        const pctB = (b.floor_price_eur > 0) ? ((b.seller_loss_eur || 0) / b.floor_price_eur) : -999;
        return pctB - pctA;
      case 'floor_desc':
        return (b.floor_price_eur || 0) - (a.floor_price_eur || 0);
      case 'tf2_desc':
        return Number(b.tf2_keys_offered) - Number(a.tf2_keys_offered);
      case 'tf2_asc':
        return Number(a.tf2_keys_offered) - Number(b.tf2_keys_offered);
      case 'name_asc':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  if (filtered.length === 0) {
    gamesGrid.innerHTML = `
      <div class="col-span-full py-16 text-center text-slate-500">
        <i class="fa-solid fa-gamepad text-4xl mb-3 block"></i>
        <p class="text-sm font-semibold">No se encontraron juegos con los filtros seleccionados.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(game => {
    const card = document.createElement('div');
    card.className = "game-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition";

    const lossEur = (typeof game.seller_loss_eur === 'number') ? game.seller_loss_eur : null;
    const floorPrice = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : null;
    const floorSource = game.floor_price_source || 'Suelo Mínimo';

    let lossBadgeHtml = '';
    if (lossEur !== null && floorPrice !== null && floorPrice > 0) {
      if (lossEur > 0) {
        const lossPct = (lossEur / floorPrice) * 100;
        lossBadgeHtml = `
          <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs space-y-0.5">
            <div class="flex justify-between items-center font-bold text-[10px]">
              <span class="flex items-center gap-1 text-rose-300" title="Suelo de mercado: ${floorPrice.toFixed(2)}€ (${floorSource})">
                <i class="fa-solid fa-arrow-trend-down text-rose-400"></i> Dejas de ganar:
              </span>
              <span class="text-[11px] font-black text-rose-400 font-mono">+${lossEur.toFixed(2)} € (${lossPct.toFixed(1)}%)</span>
            </div>
            <div class="text-[9px] text-right text-slate-400 flex justify-between font-mono">
              <span>Suelo: ${floorPrice.toFixed(2)}€</span>
              <span class="italic text-[8px] truncate max-w-[120px] font-sans">${floorSource}</span>
            </div>
          </div>
        `;
      } else {
        const gainEur = Math.abs(lossEur);
        lossBadgeHtml = `
          <div class="bg-emerald-950/60 border border-emerald-800/50 p-2 rounded-lg text-xs space-y-0.5 text-emerald-300">
            <div class="flex justify-between items-center font-bold text-[10px]">
              <span class="flex items-center gap-1">
                <i class="fa-solid fa-check-circle text-emerald-400"></i> Trato favorable:
              </span>
              <span class="text-[11px] font-black text-emerald-300 font-mono">+${gainEur.toFixed(2)} € sobre suelo</span>
            </div>
            <div class="text-[9px] text-right text-emerald-400/80 flex justify-between font-mono">
              <span>Suelo: ${floorPrice.toFixed(2)}€</span>
              <span class="font-semibold text-[8px] font-sans">¡Pagan por encima del suelo!</span>
            </div>
          </div>
        `;
      }
    } else {
      lossBadgeHtml = `
        <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg text-[10px] text-slate-500 text-center">
          Cotización de suelo pendiente
        </div>
      `;
    }

    const delistedBadge = game.is_delisted_steam ? `
      <span class="bg-rose-900/90 backdrop-blur border border-rose-600/80 text-rose-200 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md" title="${game.delisted_reason || 'Juego retirado de la tienda oficial de Steam'}">
        <i class="fa-solid fa-triangle-exclamation text-rose-300 text-[8px]"></i> DELISTED
      </span>
    ` : '';

    let soldBadgeText = '';
    if (game.is_sold) {
      const isEur = game.sold_currency === 'EUR';
      const priceVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || game.tf2_keys_offered);
      const formattedPrice = isEur ? `${Number(priceVal).toFixed(2)} €` : `${priceVal} TF2`;
      const noteSuffix = game.sold_note ? ` - ${escapeHtml(game.sold_note)}` : '';
      soldBadgeText = `VENDIDO (${formattedPrice}${noteSuffix})`;
    }

    const soldBadgeCard = game.is_sold ? `
      <span class="bg-emerald-950/95 backdrop-blur border border-emerald-600 text-emerald-300 text-[9px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-md" title="${escapeHtml(soldBadgeText)}">
        <i class="fa-solid fa-check text-emerald-400 text-[8px]"></i> ${soldBadgeText}
      </span>
    ` : '';

    const headerImage = game.steam_header_image || FALLBACK_GAME_SVG;
    const safeName = escapeHtml(game.name);

    // Precios Actuales
    const curOfficialNum = (typeof game.ggdeals_current_official === 'number') ? game.ggdeals_current_official : ((typeof game.steam_store_price === 'number') ? game.steam_store_price : null);
    const curOfficialStr = curOfficialNum !== null ? `${curOfficialNum.toFixed(2)}€` : (game.is_delisted_steam ? '<span class="text-rose-400 font-semibold font-sans text-[9px]">Delisted</span>' : '<span class="text-slate-600">N/D</span>');

    const curKeyshopNum = (typeof game.ggdeals_current_keyshop === 'number') ? game.ggdeals_current_keyshop : ((typeof game.best_keyshop_price_eur === 'number') ? game.best_keyshop_price_eur : null);
    const curKeyshopStr = curKeyshopNum !== null ? `${curKeyshopNum.toFixed(2)}€` : '<span class="text-slate-600">N/D</span>';

    // Descuento Keyshop Actual vs Oficial Actual
    let curKeyshopDiscount = '';
    if (curOfficialNum && curKeyshopNum && curKeyshopNum < curOfficialNum && curOfficialNum > 0) {
      const curDiscountPct = Math.round((1 - (curKeyshopNum / curOfficialNum)) * 100);
      if (curDiscountPct > 0) curKeyshopDiscount = `-${curDiscountPct}%`;
    } else if (game.ggdeals_current_keyshop_discount) {
      curKeyshopDiscount = game.ggdeals_current_keyshop_discount;
    }

    // Mínimos Históricos
    const histOfficialNum = (typeof game.ggdeals_historical_official_low === 'number') ? game.ggdeals_historical_official_low : null;
    const histOfficialStr = histOfficialNum !== null ? (histOfficialNum === 0 ? 'Free' : `${histOfficialNum.toFixed(2)}€`) : '<span class="text-slate-600">N/D</span>';

    const histKeyshopNum = (typeof game.ggdeals_historical_keyshop_low === 'number') ? game.ggdeals_historical_keyshop_low : null;
    const histKeyshopStr = histKeyshopNum !== null ? `${histKeyshopNum.toFixed(2)}€` : '<span class="text-slate-600">N/D</span>';

    // Descuento Keyshop Histórico vs Oficial Histórico
    let histKeyshopDiscount = '';
    if (histOfficialNum && histKeyshopNum && histKeyshopNum < histOfficialNum && histOfficialNum > 0) {
      const histDiscountPct = Math.round((1 - (histKeyshopNum / histOfficialNum)) * 100);
      if (histDiscountPct > 0) histKeyshopDiscount = `-${histDiscountPct}%`;
    }

    const offerSteamEur = (typeof game.offer_value_steam_eur === 'number') ? game.offer_value_steam_eur : 0;
    const offerCashEur = (typeof game.offer_value_cash_eur === 'number') ? game.offer_value_cash_eur : 0;

    card.innerHTML = `
      <!-- Banner / Imagen Clickable para Editar con Halo Sutil -->
      <div onclick="openEditModal('${game.id}')" title="Haz clic en la imagen para editar cotización y datos" 
           class="relative h-24 bg-slate-950 overflow-hidden group cursor-pointer border-b border-slate-800/80 transition duration-300 hover:ring-2 hover:ring-blue-500/30">
        <img src="${headerImage}" alt="${safeName}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='${FALLBACK_GAME_SVG}'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
        
        <!-- Badges flotantes izquierda (Delisted / Sold) -->
        <div class="absolute top-1.5 left-1.5 flex items-center gap-1 z-10">
          ${delistedBadge}
          ${soldBadgeCard}
        </div>

        <!-- Badge flotante derecha (Lote) -->
        <div class="absolute top-1.5 right-1.5 z-10">
          <span class="bg-slate-900/90 backdrop-blur border border-slate-700/80 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow-md" title="Lote: ${game.lot_name || 'xMjalino'}">
            <i class="fa-solid fa-layer-group text-slate-400 text-[8px]"></i>
            <span>${escapeHtml(game.lot_name || 'xMjalino')}</span>
          </span>
        </div>

        <div class="absolute bottom-1.5 left-2.5 right-2.5">
          <h2 class="text-xs font-bold text-white line-clamp-1 group-hover:text-blue-300 transition" title="${safeName}">
            ${safeName}
          </h2>
        </div>
      </div>

      <!-- Contenido de la Ficha Compacto y Homogéneo -->
      <div class="p-2.5 space-y-2 flex-1 flex flex-col justify-between">

        <!-- Caja de Oferta Recibida (Valor al lado de oferta y precios Steam/Cash a la derecha) -->
        <div class="bg-slate-950 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-bold">
            <span class="text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
              <i class="fa-solid fa-hand-holding-dollar text-amber-400"></i> Oferta:
            </span>
            <span class="text-amber-400 text-sm font-black font-mono">${game.tf2_keys_offered} TF2</span>
          </div>
          <div class="text-right text-[10px] font-mono font-medium text-slate-400 flex items-center gap-1">
            <span class="text-slate-300">~${offerSteamEur.toFixed(2)}€ Steam</span>
            <span class="text-slate-600">|</span>
            <span class="text-emerald-400">~${offerCashEur.toFixed(2)}€ Cash</span>
          </div>
        </div>

        <!-- Tabla Unificada Transpuesta: Actual vs Mínimo con columna dedicada de Descuento -->
        <div class="bg-slate-950/80 border border-slate-800 rounded-lg p-2 text-xs space-y-1.5">
          <!-- Cabecera de 4 columnas -->
          <div class="grid grid-cols-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/80 pb-1">
            <span>Tipo</span>
            <span class="text-center">Oficial</span>
            <span class="text-center">Keyshops</span>
            <span class="text-right">Dto.</span>
          </div>

          <!-- Fila Actual -->
          <div class="grid grid-cols-4 items-center text-[11px] font-mono">
            <span class="text-[9px] uppercase font-semibold text-slate-400 font-sans">Actual</span>
            <span class="text-center font-bold text-white">${curOfficialStr}</span>
            <span class="text-center font-bold text-slate-200">${curKeyshopStr}</span>
            <div class="text-right">
              ${curKeyshopDiscount ? `<span class="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-semibold text-[9px]">${curKeyshopDiscount}</span>` : '<span class="text-slate-600 font-mono text-[10px]">--</span>'}
            </div>
          </div>

          <!-- Fila Mínimo Histórico -->
          <div class="grid grid-cols-4 items-center text-[11px] font-mono">
            <span class="text-[9px] uppercase font-semibold text-slate-400 font-sans" title="Mínimo Histórico">Mínimo</span>
            <span class="text-center font-medium text-slate-300" title="${game.ggdeals_historical_official_time || ''}">${histOfficialStr}</span>
            <span class="text-center font-medium text-slate-300" title="${game.ggdeals_historical_keyshop_time || ''}">${histKeyshopStr}</span>
            <div class="text-right">
              ${histKeyshopDiscount ? `<span class="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-semibold text-[9px]">${histKeyshopDiscount}</span>` : '<span class="text-slate-600 font-mono text-[10px]">--</span>'}
            </div>
          </div>
        </div>

        <!-- Rentabilidad y Suelo de Mercado (Padding homogéneo) -->
        <div>
          ${lossBadgeHtml}
        </div>

        <!-- Barra Inferior de Enlaces y Jugadores en 24h a la Izquierda -->
        <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
          <!-- Jugadores en las últimas 24h abajo a la izquierda -->
          <span class="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1" title="Jugadores activos en Steam (últimas 24h)">
            <i class="fa-solid fa-users text-slate-500 text-[9px]"></i>
            <span>${typeof game.steam_players_24h === 'number' ? game.steam_players_24h.toLocaleString() : '--'}</span>
          </span>

          <!-- Enlaces Rápidos de Verificación a la derecha -->
          <div class="flex items-center space-x-2.5">
            ${game.steam_app_id ? `
              <a href="https://store.steampowered.com/app/${game.steam_app_id}" target="_blank" class="hover:text-slate-200 transition flex items-center gap-0.5" title="Ver en Steam Store">
                <i class="fa-brands fa-steam text-xs"></i> Steam
              </a>
              <a href="https://steamdb.info/app/${game.steam_app_id}/" target="_blank" class="hover:text-slate-200 transition flex items-center gap-0.5" title="Ver en SteamDB">
                <i class="fa-solid fa-chart-simple text-[10px]"></i> SteamDB
              </a>
            ` : ''}
            <a href="https://gg.deals/games/?title=${encodeURIComponent(game.name)}" target="_blank" class="hover:text-slate-200 transition flex items-center gap-0.5 font-bold" title="Ver en GG.deals">
              <i class="fa-solid fa-arrow-up-right-from-square text-[9px]"></i> GG.deals
            </a>
          </div>
        </div>
      </div>
    `;

    gamesGrid.appendChild(card);
  });
}

function openEditModal(gameId) {
  selectedGameId = gameId;
  const game = gamesData.find(g => g.id === gameId);
  if (!game) return;

  if (modalTitle) modalTitle.textContent = game.name;
  if (modalGameImg) {
    modalGameImg.src = game.steam_header_image || FALLBACK_GAME_SVG;
    modalGameImg.onerror = function() { this.src = FALLBACK_GAME_SVG; };
  }
  if (modalGameAppId) modalGameAppId.textContent = `AppID: ${game.steam_app_id || 'N/D'}`;

  if (editGameId) editGameId.value = game.id;
  if (editSteamUrl) editSteamUrl.value = game.steam_app_id ? `https://store.steampowered.com/app/${game.steam_app_id}/` : '';
  if (editTf2Keys) editTf2Keys.value = game.tf2_keys_offered || 0;
  if (editKeyshopPrice) editKeyshopPrice.value = game.best_keyshop_price_eur || '';
  if (editOfficialPrice) editOfficialPrice.value = game.ggdeals_current_official || game.steam_store_price || '';
  if (editHistKeyshop) editHistKeyshop.value = game.ggdeals_historical_keyshop_low || '';
  if (editHistOfficial) editHistOfficial.value = game.ggdeals_historical_official_low || '';
  if (editLotName) editLotName.value = game.lot_name || 'xMjalino';

  // Estado de vendido
  const isSold = !!game.is_sold;
  if (editIsSold) editIsSold.checked = isSold;
  
  const curCurrency = game.sold_currency || 'TF2';
  if (editSoldCurrency) editSoldCurrency.value = curCurrency;
  if (editSoldCurrencyLabel) editSoldCurrencyLabel.textContent = curCurrency === 'EUR' ? '€' : 'TF2';
  if (editSoldPrice) {
    editSoldPrice.step = curCurrency === 'EUR' ? '0.01' : '0.25';
    const initVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || (isSold ? game.tf2_keys_offered : ''));
    editSoldPrice.value = initVal;
  }
  if (editSoldNote) editSoldNote.value = game.sold_note || '';
  
  if (soldKeysContainer) {
    if (isSold) {
      soldKeysContainer.classList.remove('hidden');
      soldKeysContainer.classList.add('flex');
      if (soldBadge) soldBadge.classList.remove('hidden');
    } else {
      soldKeysContainer.classList.add('hidden');
      soldKeysContainer.classList.remove('flex');
      if (soldBadge) soldBadge.classList.add('hidden');
    }
  }

  if (editModal) {
    editModal.classList.remove('hidden');
    editModal.classList.add('flex');
  }
}

function closeModal() {
  if (editModal) {
    editModal.classList.add('hidden');
    editModal.classList.remove('flex');
  }
  selectedGameId = null;
}

async function saveModalData() {
  if (!selectedGameId) return;

  const isSold = editIsSold ? editIsSold.checked : false;
  const soldCurr = editSoldCurrency ? editSoldCurrency.value : 'TF2';
  const soldPriceVal = isSold && editSoldPrice && editSoldPrice.value ? parseFloat(editSoldPrice.value) : null;
  const soldNoteVal = isSold && editSoldNote && editSoldNote.value.trim() ? editSoldNote.value.trim() : null;
  const lot = editLotName ? (editLotName.value.trim() || 'xMjalino') : 'xMjalino';

  const payload = {
    tf2_keys_offered: parseFloat(editTf2Keys.value) || 0,
    best_keyshop_price_eur: editKeyshopPrice.value ? parseFloat(editKeyshopPrice.value) : null,
    ggdeals_current_official: editOfficialPrice.value ? parseFloat(editOfficialPrice.value) : null,
    ggdeals_historical_keyshop_low: editHistKeyshop.value ? parseFloat(editHistKeyshop.value) : null,
    ggdeals_historical_official_low: editHistOfficial.value ? parseFloat(editHistOfficial.value) : null,
    is_sold: isSold,
    sold_currency: soldCurr,
    sold_price: soldPriceVal,
    sold_tf2_keys: soldCurr === 'TF2' ? soldPriceVal : null,
    sold_note: soldNoteVal,
    lot_name: lot
  };

  try {
    const res = await fetch(`/api/games/${selectedGameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      closeModal();
      await loadSummary();
      await loadGames();
    } else {
      closeModal();
      await loadSummary();
      await loadGames();
    }
  } catch (err) {
    console.error("Error saving game", err);
    closeModal();
  }
}

function checkSyncStatusLoop() {
  setInterval(async () => {
    try {
      const res = await fetch('/api/sync-status');
      const status = await res.json();
      if (status.is_syncing) {
        if (syncProgressBar) syncProgressBar.classList.remove('hidden');
        if (syncProgressMsg) syncProgressMsg.textContent = status.message || 'Sincronizando...';
        if (syncProgressFill) {
          const pct = (status.current / Math.max(1, status.total)) * 100;
          syncProgressFill.style.width = `${pct}%`;
        }
      } else {
        if (syncProgressBar && !syncProgressBar.classList.contains('hidden')) {
          syncProgressBar.classList.add('hidden');
          if (btnSyncSteam) {
            btnSyncSteam.disabled = false;
            btnSyncSteam.classList.remove('opacity-50');
          }
          await loadSummary();
          await loadGames();
        }
      }
    } catch (e) {}
  }, 2000);
}
