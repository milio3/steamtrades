// Estado de la tabla de contraoferta
let games = [];
let tf2CashPrice = 1.62;
let tf2SteamPrice = 2.02;
let keyIncreases = {}; // Map: gameId -> float (incremento de llaves)
let reviewedMap = {};  // Map: gameId -> boolean (estado revisado)
let selectedGameId = null;

// Estado de ordenación de la tabla
let currentTableSort = { field: 'id', order: 'asc' };

const tableBody = document.getElementById('table-body');
const searchInput = document.getElementById('search-table-input');
const tf2LiveBadge = document.getElementById('tf2-live-badge');
const tf2CashBadge = document.getElementById('tf2-cash-badge');

// Elementos de Estadísticas
const statOrigKeys = document.getElementById('stat-orig-keys');
const statOrigCash = document.getElementById('stat-orig-cash');
const statCounterKeys = document.getElementById('stat-counter-keys');
const statCounterCash = document.getElementById('stat-counter-cash');
const statGainKeys = document.getElementById('stat-gain-keys');
const statGainCash = document.getElementById('stat-gain-cash');
const statReviewedCount = document.getElementById('stat-reviewed-count');
const statTotalGamesCount = document.getElementById('stat-total-games-count');
const statTableTotalCount = document.getElementById('stat-table-total-count');

// Botones
const btnIncreaseAll = document.getElementById('btn-increase-all');
const btnResetAll = document.getElementById('btn-reset-all');
const btnImportCsv = document.getElementById('btn-import-csv');
const inputCsvImport = document.getElementById('input-csv-import');
const btnExportCsv = document.getElementById('btn-export-csv');

// Modal Añadir Juego
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const modalAddGame = document.getElementById('modal-add-game');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');
const btnCancelAdd = document.getElementById('btn-cancel-add');
const btnSubmitAdd = document.getElementById('btn-submit-add');
const inputSteamUrl = document.getElementById('input-steam-url');
const inputTf2Keys = document.getElementById('input-tf2-keys');
const inputBuyerName = document.getElementById('input-buyer-name');

// Modal de Edición de Juego
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
const editBuyerName = document.getElementById('edit-buyer-name');
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

// Modal de Confirmación de Importación CSV
const modalConfirmImport = document.getElementById('modal-confirm-import-csv');
const btnCloseImportModal = document.getElementById('btn-close-import-modal');
const btnCancelImportCsv = document.getElementById('btn-cancel-import-csv');
const btnApplyImportCsv = document.getElementById('btn-apply-import-csv');
const importStatSoldCount = document.getElementById('import-stat-sold-count');
const importStatPendingCount = document.getElementById('import-stat-pending-count');
const importStatListedCount = document.getElementById('import-stat-listed-count');
const importStatTotalRows = document.getElementById('import-stat-total-rows');
const importPreviewList = document.getElementById('import-preview-list');
let pendingImportRows = [];

const FALLBACK_GAME_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIiBmaWxsPSIjMWUyOTNiIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iMzIiIHJ4PSI0Ii8+PHBhdGggZD0iTTI0IDEwaC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00di00em0xNCAyYTEuNSAxLjUgMCAxIDEtMyAwIDEuNSAxLjUgMCAwIDEgMyAwem00IDRhMS41IDEuNSAwIDEgMS0zIDAgMS41IDEuNSAwIDAgMSAzIDB6bS00IDRhMS41IDEuNSAwIDEgMS0zIDAgMS41IDEuNSAwIDAgMSAzIDB6bTQtOGExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMHoiIGZpbGw9IiM2NDc0OGIiLz48L3N2Zz4=";

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  setupEvents();
});

async function initData() {
  try {
    const resSummary = await fetch('/api/summary');
    const summary = await resSummary.json();
    if (summary && summary.tf2_cash_price) {
      tf2CashPrice = summary.tf2_cash_price;
      tf2SteamPrice = summary.tf2_steam_price;
      if (tf2LiveBadge) tf2LiveBadge.textContent = `${tf2SteamPrice.toFixed(2)} €`;
      if (tf2CashBadge) tf2CashBadge.textContent = `${tf2CashPrice.toFixed(2)} €`;
      const tf2LastUpdateEl = document.getElementById('tf2-last-update');
      if (tf2LastUpdateEl) {
        if (summary.last_tf2_update) {
          tf2LastUpdateEl.textContent = `(${summary.last_tf2_update})`;
          tf2LastUpdateEl.title = `Última cotización oficial: ${summary.last_tf2_update}`;
        } else {
          tf2LastUpdateEl.textContent = '';
        }
      }
    }

    const resGames = await fetch('/api/games');
    const allGames = await resGames.json();
    // Excluir juegos vendidos e incidencias: la tabla es exclusivamente para negociación activa
    games = allGames.filter(g => g.status !== 'sold' && !g.is_sold && g.status !== 'issue');

    // Cargar progreso persistido de la base de datos
    games.forEach(g => {
      if (g.counter_increase_tf2 && Number(g.counter_increase_tf2) > 0) {
        keyIncreases[g.id] = Number(g.counter_increase_tf2);
      }
      if (g.is_reviewed) {
        reviewedMap[g.id] = true;
      }
    });

    // Complementar con localStorage si existe
    try {
      const savedInc = localStorage.getItem('steamtrades_key_increases') || localStorage.getItem('steamkeys_key_increases');
      if (savedInc) {
        const parsed = JSON.parse(savedInc);
        Object.keys(parsed).forEach(k => {
          if (keyIncreases[k] === undefined) keyIncreases[k] = parsed[k];
        });
      }
      const savedRev = localStorage.getItem('steamtrades_reviewed_map') || localStorage.getItem('steamkeys_reviewed_map');
      if (savedRev) {
        const parsed = JSON.parse(savedRev);
        Object.keys(parsed).forEach(k => {
          if (reviewedMap[k] === undefined) reviewedMap[k] = parsed[k];
        });
      }
    } catch (e) {}

    if (statTotalGamesCount) statTotalGamesCount.textContent = games.length;

    renderTable();
    calculateTotals();
  } catch (err) {
    console.error("Error al cargar datos de la tabla:", err);
  }
}

function saveStoredData() {
  try {
    localStorage.setItem('steamtrades_key_increases', JSON.stringify(keyIncreases));
    localStorage.setItem('steamtrades_reviewed_map', JSON.stringify(reviewedMap));
  } catch (e) {}

  // Sincronizar en segundo plano con el backend
  fetch('/api/games/bulk-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increases: keyIncreases, reviewed: reviewedMap })
  }).catch(() => {});
}

function setupEvents() {
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderTable();
    });
  }

  if (btnIncreaseAll) {
    btnIncreaseAll.addEventListener('click', () => {
      games.forEach(g => {
        const curInc = Number(keyIncreases[g.id] || 0);
        keyIncreases[g.id] = Number((curInc + 0.25).toFixed(2));
      });
      saveStoredData();
      renderTable();
      calculateTotals();
      showToast("+0.25 TF2 añadido a todos los juegos.", "success");
    });
  }

  if (btnResetAll) {
    btnResetAll.addEventListener('click', () => {
      keyIncreases = {};
      saveStoredData();
      renderTable();
      calculateTotals();
      showToast("Aumentos de contraoferta restablecidos a 0.", "info");
    });
  }

  if (btnImportCsv && inputCsvImport) {
    btnImportCsv.addEventListener('click', () => {
      inputCsvImport.value = '';
      inputCsvImport.click();
    });
    inputCsvImport.addEventListener('change', handleCsvFileSelect);
  }

  const closeImportModal = () => {
    if (modalConfirmImport) {
      modalConfirmImport.classList.add('hidden');
      modalConfirmImport.classList.remove('flex');
    }
    pendingImportRows = [];
  };

  if (btnCloseImportModal) btnCloseImportModal.addEventListener('click', closeImportModal);
  if (btnCancelImportCsv) btnCancelImportCsv.addEventListener('click', closeImportModal);
  if (btnApplyImportCsv) btnApplyImportCsv.addEventListener('click', applyImportCsv);

  if (btnExportCsv) btnExportCsv.addEventListener('click', exportToCsv);

  // Modal Añadir Juego
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      if (inputSteamUrl) inputSteamUrl.value = '';
      if (inputTf2Keys) inputTf2Keys.value = '1.0';
      if (inputBuyerName) inputBuyerName.value = '';
      if (modalAddGame) {
        modalAddGame.classList.remove('hidden');
        modalAddGame.classList.add('flex');
      }
    });
  }

  const closeAddModal = () => {
    if (modalAddGame) {
      modalAddGame.classList.add('hidden');
      modalAddGame.classList.remove('flex');
    }
  };

  if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

  if (btnSubmitAdd) {
    btnSubmitAdd.addEventListener('click', async () => {
      const steamUrl = inputSteamUrl ? inputSteamUrl.value.trim() : '';
      const tf2Keys = inputTf2Keys ? parseFloat(inputTf2Keys.value) : 1.0;
      const buyer = inputBuyerName ? (inputBuyerName.value.trim() || 'xMjalino') : 'xMjalino';

      if (!steamUrl) {
        showToast("Introduce una URL válida de Steam.", "warning");
        return;
      }

      btnSubmitAdd.disabled = true;
      btnSubmitAdd.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Añadiendo...`;

      try {
        const res = await fetch('/api/games/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ steam_url: steamUrl, tf2_keys_offered: tf2Keys, buyer_name: buyer })
        });

        const data = await res.json();
        if (res.ok && data.status === 'ok') {
          closeAddModal();
          showToast(`¡Juego "${data.game.name}" añadido con éxito!`, "success");
          await initData();
        } else {
          showToast(data.detail || 'Error al añadir el juego.', "error");
        }
      } catch (err) {
        showToast("Error de conexión con el servidor.", "error");
      } finally {
        btnSubmitAdd.disabled = false;
        btnSubmitAdd.innerHTML = `<i class="fa-solid fa-plus"></i> Añadir y Calcular`;
      }
    });
  }

  // Modal de Edición de Juego
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeEditModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeEditModal);
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
      const isChecked = editIsSold.checked;
      if (soldKeysContainer) {
        if (isChecked) {
          soldKeysContainer.classList.remove('hidden');
          soldKeysContainer.classList.add('flex');
          if (soldBadge) soldBadge.classList.remove('hidden');
          // Precargar con contraoferta o oferta original si está vacío
          if (editSoldPrice && !editSoldPrice.value) {
            const curGame = games.find(g => String(g.id) === String(selectedGameId));
            if (curGame) editSoldPrice.value = getEffectiveOffer(curGame);
          }
        } else {
          soldKeysContainer.classList.add('hidden');
          soldKeysContainer.classList.remove('flex');
          if (soldBadge) soldBadge.classList.add('hidden');
        }
      }
    });
  }
}

function getIncrease(game) {
  const inc = keyIncreases[game.id];
  if (inc !== undefined && inc !== null && inc !== '' && !isNaN(inc)) {
    return Number(inc);
  }
  return 0;
}

function getEffectiveOffer(game) {
  return Number((Number(game.tf2_keys_offered) + getIncrease(game)).toFixed(2));
}

function getMinCurrentPrice(game) {
  const curPrices = [];
  if (typeof game.ggdeals_current_keyshop === 'number' && game.ggdeals_current_keyshop > 0.05) curPrices.push(game.ggdeals_current_keyshop);
  if (typeof game.best_keyshop_price_eur === 'number' && game.best_keyshop_price_eur > 0.05) curPrices.push(game.best_keyshop_price_eur);
  if (typeof game.ggdeals_current_official === 'number' && game.ggdeals_current_official > 0.05) curPrices.push(game.ggdeals_current_official);
  if (typeof game.steam_store_price === 'number' && game.steam_store_price > 0.05 && !game.is_delisted_steam) curPrices.push(game.steam_store_price);
  return curPrices.length > 0 ? Math.min(...curPrices) : 9999;
}

function getBalancePct(game) {
  const floorEur = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : 0;
  if (floorEur <= 0) return 0;
  const effectiveCash = getEffectiveOffer(game) * tf2CashPrice;
  return ((effectiveCash - floorEur) / floorEur) * 100;
}

function getImprovementPct(game) {
  const floorEur = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : 0;
  const origTf2 = Number(game.tf2_keys_offered);
  const incTf2 = getIncrease(game);
  if (incTf2 <= 0) return 0;
  const origCash = origTf2 * tf2CashPrice;
  const lossEur = floorEur - origCash;
  const incCash = incTf2 * tf2CashPrice;
  if (lossEur > 0) return (incCash / lossEur) * 100;
  return (incTf2 / origTf2) * 100;
}

function handleSortTable(field) {
  if (currentTableSort.field === field) {
    currentTableSort.order = currentTableSort.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentTableSort.field = field;
    currentTableSort.order = (field === 'name' || field === 'index' || field === 'buyer') ? 'asc' : 'desc';
  }

  updateSortIcons();
  renderTable();
}

function updateSortIcons() {
  const fields = ['id', 'name', 'buyer', 'players', 'min_current', 'floor', 'orig_tf2', 'increase', 'counter_tf2', 'balance', 'improvement', 'reviewed'];
  fields.forEach(f => {
    const icon = document.getElementById(`sort-icon-${f}`);
    if (!icon) return;
    if (currentTableSort.field === f) {
      icon.className = `fa-solid fa-arrow-${currentTableSort.order === 'asc' ? 'up' : 'down'} text-[9px] text-slate-200 opacity-100 font-bold`;
    } else {
      icon.className = 'fa-solid fa-sort text-[8px] opacity-40';
    }
  });
}

function toggleReviewed(gameId) {
  reviewedMap[gameId] = !reviewedMap[gameId];
  saveStoredData();
  renderTable();
  calculateTotals();
}

function renderTable() {
  if (!tableBody) return;
  const term = (searchInput ? searchInput.value : '').toLowerCase().trim();

  let list = [...games];

  if (term) {
    list = list.filter(g => g.name.toLowerCase().includes(term));
  }

  // Ordenación
  const { field, order } = currentTableSort;
  const mult = order === 'asc' ? 1 : -1;

  list.sort((a, b) => {
    switch (field) {
      case 'name':
        return mult * a.name.localeCompare(b.name);
      case 'buyer':
        return mult * (a.buyer_name || 'xMjalino').localeCompare(b.buyer_name || 'xMjalino');
      case 'players':
        return mult * ((a.steam_players_24h || 0) - (b.steam_players_24h || 0));
      case 'min_current':
        return mult * (getMinCurrentPrice(a) - getMinCurrentPrice(b));
      case 'floor':
        return mult * ((a.floor_price_eur || 0) - (b.floor_price_eur || 0));
      case 'orig_tf2':
        return mult * (Number(a.tf2_keys_offered) - Number(b.tf2_keys_offered));
      case 'increase':
        return mult * (getIncrease(a) - getIncrease(b));
      case 'counter_tf2':
        return mult * (getEffectiveOffer(a) - getEffectiveOffer(b));
      case 'balance':
        return mult * (getBalancePct(a) - getBalancePct(b));
      case 'improvement':
        return mult * (getImprovementPct(a) - getImprovementPct(b));
      case 'reviewed':
        return mult * ((reviewedMap[a.id] ? 1 : 0) - (reviewedMap[b.id] ? 1 : 0));
      case 'id':
      case 'index':
      default:
        return mult * (Number(a.id) - Number(b.id));
    }
  });

  tableBody.innerHTML = '';

  list.forEach((game, index) => {
    const row = document.createElement('tr');
    row.id = `row-${game.id}`;
    row.className = "hover:bg-slate-800/50 transition border-b border-slate-800/60";

    const origTf2 = Number(game.tf2_keys_offered);
    const increaseTf2 = getIncrease(game);
    const effectiveTf2 = getEffectiveOffer(game);
    const increaseCash = increaseTf2 * tf2CashPrice;
    const effectiveCash = effectiveTf2 * tf2CashPrice;
    const isRev = !!reviewedMap[game.id];
    const isSold = !!game.is_sold;

    // 1. Jugadores Activos en Steam (24h)
    let playersHtml = `<span class="text-slate-600 font-mono text-[11px]">--</span>`;
    if (typeof game.steam_players_24h === 'number') {
      playersHtml = `
        <span class="text-slate-300 font-mono text-xs font-semibold flex items-center justify-center gap-1">
          <i class="fa-solid fa-users text-slate-500 text-[10px]"></i>
          <span>${game.steam_players_24h.toLocaleString()}</span>
        </span>
      `;
    }

    // 2. Mínimo Actual (TF2 principal / € secundario)
    const curPrices = [];
    if (typeof game.ggdeals_current_keyshop === 'number' && game.ggdeals_current_keyshop > 0.05) curPrices.push(game.ggdeals_current_keyshop);
    if (typeof game.best_keyshop_price_eur === 'number' && game.best_keyshop_price_eur > 0.05) curPrices.push(game.best_keyshop_price_eur);
    if (typeof game.ggdeals_current_official === 'number' && game.ggdeals_current_official > 0.05) curPrices.push(game.ggdeals_current_official);
    if (typeof game.steam_store_price === 'number' && game.steam_store_price > 0.05 && !game.is_delisted_steam) curPrices.push(game.steam_store_price);
    
    const minCurrentPriceEur = curPrices.length > 0 ? Math.min(...curPrices) : null;
    let minCurrentHtml = '--';
    if (minCurrentPriceEur !== null) {
      const minCurrentTf2 = (minCurrentPriceEur / tf2CashPrice);
      minCurrentHtml = `
        <span class="font-bold text-slate-200 text-xs block">${minCurrentTf2.toFixed(2)} TF2</span>
        <span class="text-[10px] text-slate-400 block">(~${minCurrentPriceEur.toFixed(2)} €)</span>
      `;
    }

    // 3. Suelo Mínimo (TF2 principal / € secundario)
    const floorPriceEur = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : null;
    const floorSource = game.floor_price_source || 'Suelo Mínimo';
    let floorHtml = '--';
    if (floorPriceEur !== null) {
      const floorTf2 = (floorPriceEur / tf2CashPrice);
      floorHtml = `
        <span class="font-bold text-slate-200 text-xs block">${floorTf2.toFixed(2)} TF2</span>
        <span class="text-[10px] text-slate-400 block" title="Fuente: ${floorSource}">(~${floorPriceEur.toFixed(2)} €)</span>
      `;
    }

    // 4. Balance vs Suelo Mínimo (Ganancia / Pérdida respecto a tu oferta final)
    let balanceHtml = '--';
    if (floorPriceEur !== null) {
      const balanceEur = effectiveCash - floorPriceEur;
      const balancePct = (balanceEur / floorPriceEur) * 100;
      
      if (balanceEur >= 0) {
        balanceHtml = `
          <span class="bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px] font-bold inline-block font-mono">
            +${balancePct.toFixed(1)}%
          </span>
          <span class="text-[10px] text-emerald-400/80 block mt-0.5 font-medium">+${balanceEur.toFixed(2)}€</span>
        `;
      } else {
        balanceHtml = `
          <span class="bg-rose-950/50 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded text-[11px] font-bold inline-block font-mono">
            ${balancePct.toFixed(1)}%
          </span>
          <span class="text-[10px] text-rose-300/80 block mt-0.5 font-medium">${balanceEur.toFixed(2)}€</span>
        `;
      }
    }

    // 5. Cálculo de Mejora
    const origCash = origTf2 * tf2CashPrice;
    const originalLossEur = floorPriceEur !== null ? (floorPriceEur - origCash) : 0;
    
    let improvementHtml = '';
    if (increaseTf2 > 0) {
      if (originalLossEur > 0) {
        const pctRecovered = (increaseCash / originalLossEur) * 100;
        improvementHtml = `
          <span class="text-slate-200 font-bold font-mono text-xs block">+${pctRecovered.toFixed(1)}%</span>
          <span class="text-[10px] text-slate-400 block">+${increaseCash.toFixed(2)}€ recup.</span>
        `;
      } else {
        const pctOverOrig = (increaseTf2 / origTf2) * 100;
        improvementHtml = `
          <span class="text-slate-200 font-bold font-mono text-xs block">+${pctOverOrig.toFixed(1)}%</span>
          <span class="text-[10px] text-slate-400 block">+${increaseCash.toFixed(2)}€ extra</span>
        `;
      }
    } else {
      improvementHtml = `<span class="text-slate-500 text-[11px] font-mono">0.0%</span>`;
    }

    // Delisted (Coleccionista) y Sold badges
    const delistedIcon = game.is_delisted_steam 
      ? `<span class="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-600/70 font-semibold px-1.5 py-0.5 rounded ml-1.5 inline-flex items-center gap-0.5" title="Juego retirado de Steam (Artículo de Coleccionista)"><i class="fa-solid fa-crown text-amber-400"></i> Coleccionista</span>` 
      : '';

    let soldIconText = '';
    let soldIconTitle = '';
    if (isSold) {
      const isEur = game.sold_currency === 'EUR';
      const priceVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || effectiveTf2);
      const formattedPrice = isEur ? `${Number(priceVal).toFixed(2)} €` : `${priceVal} TF2`;
      const noteSuffix = game.sold_note ? ` - ${escapeHtml(game.sold_note)}` : '';
      soldIconText = `Vendido (${formattedPrice}${noteSuffix})`;
      soldIconTitle = `Vendido por ${formattedPrice}${game.sold_note ? ` (${game.sold_note})` : ''}`;
    }

    const soldIcon = isSold
      ? `<span class="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold px-1.5 py-0.5 rounded ml-1.5 inline-flex items-center gap-0.5" title="${escapeHtml(soldIconTitle)}"><i class="fa-solid fa-check"></i> ${soldIconText}</span>`
      : '';

    // Botón de Revisado
    const reviewBtnHtml = isRev ? `
      <button onclick="toggleReviewed('${game.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 transition flex items-center justify-center gap-1 mx-auto shadow-sm">
        <i class="fa-solid fa-check text-[9px]"></i> Revisado
      </button>
    ` : `
      <button onclick="toggleReviewed('${game.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 transition flex items-center justify-center gap-1 mx-auto">
        <span class="w-1.5 h-1.5 rounded-full bg-slate-500"></span> Pendiente
      </button>
    `;

    const headerImg = game.steam_header_image || FALLBACK_GAME_SVG;
    const safeName = escapeHtml(game.name);

    // Input protegido si está revisado
    const inputDisabledAttr = isRev ? 'disabled' : '';
    const inputClass = isRev 
      ? 'w-16 bg-slate-950/40 border border-slate-800 text-slate-500 rounded-lg px-1.5 py-1 text-center font-mono text-xs cursor-not-allowed opacity-50' 
      : `w-16 bg-slate-950 border ${increaseTf2 > 0 ? 'border-slate-500 text-slate-100 font-bold' : 'border-slate-800 text-slate-300'} rounded-lg px-1.5 py-1 text-center font-mono text-xs focus:outline-none focus:border-slate-500 transition`;

    row.innerHTML = `
      <td class="p-2.5 pl-3 text-center text-slate-400 font-mono text-xs font-semibold" title="ID de Oferta: ${game.id}">${game.id}</td>
      <td class="p-2.5 font-medium text-slate-100">
        <div class="flex items-center gap-2.5">
          <img src="${headerImg}" onclick="openEditModal('${game.id}')" class="w-10 h-5 object-cover rounded-md flex-shrink-0 shadow-sm border border-slate-800 cursor-pointer hover:ring-1 hover:ring-blue-500" onerror="this.onerror=null; this.src='${FALLBACK_GAME_SVG}'" title="Haz clic para editar juego">
          <div class="truncate">
            <span onclick="openEditModal('${game.id}')" class="text-xs hover:text-blue-300 transition cursor-pointer font-semibold" title="Haz clic para editar juego">${safeName}</span>
            ${delistedIcon}
            ${soldIcon}
          </div>
        </div>
      </td>

      <!-- Comprador (Columna Dedicada) -->
      <td class="p-2.5 text-center">
        <span class="text-[10px] bg-slate-950 text-slate-300 border border-slate-800 font-semibold px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 shadow-sm" title="Comprador: ${escapeHtml(game.buyer_name || 'Sin comprador')}">
          <i class="fa-solid fa-user text-[9px] text-indigo-400"></i>
          <span>${escapeHtml(game.buyer_name || '-')}</span>
        </span>
      </td>
      
      <!-- Jugadores 24h -->
      <td class="p-2.5 text-center">${playersHtml}</td>

      <!-- Mínimo Actual (TF2 principal / € secundario) -->
      <td class="p-2.5 text-center font-mono text-xs">${minCurrentHtml}</td>
      
      <!-- Suelo Mínimo (TF2 principal / € secundario) -->
      <td class="p-2.5 text-center font-mono text-xs border-r border-slate-800" title="Fuente: ${floorSource}">${floorHtml}</td>
      
      <!-- Oferta Recibida (Solo TF2) -->
      <td class="p-2.5 text-center text-slate-200 font-mono text-xs">
        <span class="font-bold">${origTf2} TF2</span>
      </td>

      <!-- Valor de Contraoferta / Aumentar TF2 (Protegido si está Revisado) -->
      <td class="p-2.5 text-center border-r border-slate-800">
        <div class="inline-flex items-center gap-1 justify-center">
          <span class="text-slate-500 font-bold text-xs">+</span>
          <input type="number" step="0.25" min="0" 
                 id="inc-input-${game.id}"
                 ${inputDisabledAttr}
                 value="${increaseTf2 > 0 ? increaseTf2 : ''}" 
                 placeholder="0.00" 
                 oninput="handleIncreaseInput('${game.id}', this.value)"
                 class="${inputClass}">
          <span class="text-[10px] text-slate-500 font-bold">TF2</span>
        </div>
      </td>

      <!-- Contraoferta TF2 -->
      <td id="cell-counter-${game.id}" class="p-2.5 text-center font-mono">
        <div class="flex flex-col items-center">
          <span class="font-bold text-slate-100 text-xs">
            ${effectiveTf2} TF2
          </span>
          <span class="text-[10px] text-slate-400 font-medium">
            ~${effectiveCash.toFixed(2)} € ${increaseTf2 > 0 ? `(+${increaseCash.toFixed(2)}€)` : ''}
          </span>
        </div>
      </td>

      <!-- Balance vs Suelo -->
      <td id="cell-balance-${game.id}" class="p-2.5 text-center font-mono">
        ${balanceHtml}
      </td>

      <!-- Mejora -->
      <td id="cell-improvement-${game.id}" class="p-2.5 text-center font-mono">
        ${improvementHtml}
      </td>

      <!-- Botón de Revisado -->
      <td class="p-2.5 pr-3 text-center">
        ${reviewBtnHtml}
      </td>
    `;

    tableBody.appendChild(row);
  });
}

function toggleReviewed(gameId) {
  const gid = isNaN(Number(gameId)) ? gameId : Number(gameId);
  const isCurrentlyRev = !!reviewedMap[gid] || !!reviewedMap[gameId];
  
  if (isCurrentlyRev) {
    delete reviewedMap[gid];
    delete reviewedMap[gameId];
  } else {
    reviewedMap[gid] = true;
    reviewedMap[gameId] = true;
  }
  
  saveStoredData();
  calculateTotals();
  renderTable();
}

function handleIncreaseInput(gameId, value) {
  const gid = isNaN(Number(gameId)) ? gameId : Number(gameId);
  if (value === '' || isNaN(value) || parseFloat(value) <= 0) {
    delete keyIncreases[gid];
    delete keyIncreases[gameId];
  } else {
    keyIncreases[gid] = parseFloat(value);
    keyIncreases[gameId] = parseFloat(value);
  }
  
  saveStoredData();
  calculateTotals();
  updateRowCells(gameId);
}

function updateRowCells(gameId) {
  const game = games.find(g => String(g.id) === String(gameId));
  if (!game) return;

  const origTf2 = Number(game.tf2_keys_offered);
  const increaseTf2 = getIncrease(game);
  const effectiveTf2 = getEffectiveOffer(game);
  const increaseCash = increaseTf2 * tf2CashPrice;
  const effectiveCash = effectiveTf2 * tf2CashPrice;
  const floorPriceEur = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : null;

  // 1. Celda Contraoferta
  const cellCounter = document.getElementById(`cell-counter-${game.id}`);
  if (cellCounter) {
    cellCounter.innerHTML = `
      <div class="flex flex-col items-center">
        <span class="font-bold text-slate-100 text-xs">
          ${effectiveTf2} TF2
        </span>
        <span class="text-[10px] text-slate-400 font-medium">
          ~${effectiveCash.toFixed(2)} € ${increaseTf2 > 0 ? `(+${increaseCash.toFixed(2)}€)` : ''}
        </span>
      </div>
    `;
  }

  // 2. Celda Balance vs Suelo
  const cellBalance = document.getElementById(`cell-balance-${game.id}`);
  if (cellBalance && floorPriceEur !== null) {
    const balanceEur = effectiveCash - floorPriceEur;
    const balancePct = (balanceEur / floorPriceEur) * 100;
    if (balanceEur >= 0) {
      cellBalance.innerHTML = `
        <span class="bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 px-2 py-0.5 rounded text-[11px] font-bold inline-block font-mono">
          +${balancePct.toFixed(1)}%
        </span>
        <span class="text-[10px] text-emerald-400/80 block mt-0.5 font-medium">+${balanceEur.toFixed(2)}€</span>
      `;
    } else {
      cellBalance.innerHTML = `
        <span class="bg-rose-950/50 text-rose-300 border border-rose-800/40 px-2 py-0.5 rounded text-[11px] font-bold inline-block font-mono">
          ${balancePct.toFixed(1)}%
        </span>
        <span class="text-[10px] text-rose-300/80 block mt-0.5 font-medium">${balanceEur.toFixed(2)}€</span>
      `;
    }
  }

  // 3. Celda Mejora
  const cellImp = document.getElementById(`cell-improvement-${game.id}`);
  if (cellImp) {
    const origCash = origTf2 * tf2CashPrice;
    const originalLossEur = floorPriceEur !== null ? (floorPriceEur - origCash) : 0;
    if (increaseTf2 > 0) {
      if (originalLossEur > 0) {
        const pctRecovered = (increaseCash / originalLossEur) * 100;
        cellImp.innerHTML = `
          <span class="text-slate-200 font-bold font-mono text-xs block">+${pctRecovered.toFixed(1)}%</span>
          <span class="text-[10px] text-slate-400 block">+${increaseCash.toFixed(2)}€ recup.</span>
        `;
      } else {
        const pctOverOrig = (increaseTf2 / origTf2) * 100;
        cellImp.innerHTML = `
          <span class="text-slate-200 font-bold font-mono text-xs block">+${pctOverOrig.toFixed(1)}%</span>
          <span class="text-[10px] text-slate-400 block">+${increaseCash.toFixed(2)}€ extra</span>
        `;
      }
    } else {
      cellImp.innerHTML = `<span class="text-slate-500 text-[11px] font-mono">0.0%</span>`;
    }
  }
}

function calculateTotals() {
  let totalOrigKeys = 0;
  let totalCounterKeys = 0;
  let reviewedCount = 0;

  games.forEach(g => {
    const orig = Number(g.tf2_keys_offered);
    const inc = getIncrease(g);
    const effective = orig + inc;
    
    totalOrigKeys += orig;
    totalCounterKeys += effective;

    if (reviewedMap[g.id]) {
      reviewedCount++;
    }
  });

  const origCash = totalOrigKeys * tf2CashPrice;
  const counterCash = totalCounterKeys * tf2CashPrice;
  const diffKeys = totalCounterKeys - totalOrigKeys;
  const diffCash = diffKeys * tf2CashPrice;

  if (statOrigKeys) statOrigKeys.textContent = `${totalOrigKeys.toFixed(2)} TF2`;
  if (statOrigCash) statOrigCash.textContent = `(${origCash.toFixed(2)} €)`;
  if (statCounterKeys) statCounterKeys.textContent = `${totalCounterKeys.toFixed(2)} TF2`;
  if (statCounterCash) statCounterCash.textContent = `(${counterCash.toFixed(2)} €)`;

  if (statGainKeys) {
    statGainKeys.textContent = `${diffKeys >= 0 ? '+' : ''}${diffKeys.toFixed(2)} TF2`;
  }

  if (statGainCash) {
    statGainCash.textContent = `(${diffCash >= 0 ? '+' : ''}${diffCash.toFixed(2)} €)`;
  }

  if (statReviewedCount) statReviewedCount.textContent = reviewedCount;
  if (statTotalGamesCount) statTotalGamesCount.textContent = games.length;
  if (statTableTotalCount) statTableTotalCount.textContent = games.length;
}

// Modal de edición
function openEditModal(gameId) {
  selectedGameId = gameId;
  const game = games.find(g => String(g.id) === String(gameId));
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
  if (editBuyerName) editBuyerName.value = game.buyer_name || 'xMjalino';

  // Estado de vendido
  const isSold = !!game.is_sold;
  if (editIsSold) editIsSold.checked = isSold;
  
  const curCurrency = game.sold_currency || 'TF2';
  if (editSoldCurrency) editSoldCurrency.value = curCurrency;
  if (editSoldCurrencyLabel) editSoldCurrencyLabel.textContent = curCurrency === 'EUR' ? '€' : 'TF2';
  if (editSoldPrice) {
    editSoldPrice.step = curCurrency === 'EUR' ? '0.01' : '0.25';
    const initVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || (isSold ? getEffectiveOffer(game) : ''));
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

function closeEditModal() {
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
  const buyer = editBuyerName ? (editBuyerName.value.trim() || 'xMjalino') : 'xMjalino';

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
    buyer_name: buyer
  };

  try {
    const res = await fetch(`/api/games/${selectedGameId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    closeEditModal();
    showToast("¡Cambios guardados con éxito!", "success");
    await initData();
  } catch (err) {
    console.error("Error saving game", err);
    closeEditModal();
    showToast("Error al guardar cambios.", "error");
  }
}

function copyCounterOfferText() {
  const lines = games.map(g => {
    const effective = getEffectiveOffer(g);
    return `${g.name} | ${effective} TF2`;
  });

  const fullText = lines.join('\n');
  navigator.clipboard.writeText(fullText).then(() => {
    showToast(`¡Lista copiada al portapapeles! (${games.length} juegos)`, "success");
  }).catch(() => {
    const textarea = document.createElement('textarea');
    textarea.value = fullText;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast(`¡Lista copiada al portapapeles! (${games.length} juegos)`, "success");
  });
}

function exportToCsv() {
  if (!games || games.length === 0) {
    showToast("No hay juegos en la tabla para exportar.", "warning");
    return;
  }

  // Formateador de números (usamos punto o valor numérico directo compatible)
  const formatDecimal = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '';
    return num.toString();
  };

  // Cabeceras exactas de la plantilla solicitada
  let csv = "GameID;Game;Buyer;Offer;CounterOffer;Increment;Revised;Accepted;SoldCurrecy;SoldPrice\r\n";
  
  games.forEach(g => {
    const gameId = g.id;
    const cleanName = (g.name || '')
      .replace(/;/g, ' - ')
      .replace(/"/g, '""')
      .trim();
    const cleanBuyer = (g.buyer_name || 'xMjalino')
      .replace(/;/g, ' - ')
      .replace(/"/g, '""')
      .trim();

    const offer = Number(g.tf2_keys_offered || g.offer_price || 0);
    const increment = getIncrease(g);
    const counterOffer = offer + increment;
    const revised = reviewedMap[g.id] ? 1 : 0;
    const accepted = g.is_sold ? 1 : 0;
    const soldCurrency = g.sold_currency || 'TF2';
    
    let soldPrice = '';
    if (g.is_sold) {
      if (g.sold_price !== null && g.sold_price !== undefined) {
        soldPrice = g.sold_price;
      } else {
        soldPrice = g.sold_tf2_keys || counterOffer;
      }
    }

    csv += `"${gameId}";"${cleanName}";"${cleanBuyer}";${formatDecimal(offer)};${formatDecimal(counterOffer)};${formatDecimal(increment)};${revised};${accepted};"${soldCurrency}";${formatDecimal(soldPrice)}\r\n`;
  });

  // BOM UTF-8 (\uFEFF) para compatibilidad nativa con Microsoft Excel en español/Windows
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `steamtrades_table_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`¡Tabla exportada con éxito! (${games.length} juegos)`, "success");
}

function parseCsvLine(text) {
  let p = '', row = [''], i = 0, r = true;
  for (let c of text) {
    if (c === '"') {
      if (r && p === '"') row[i] += '"';
      r = !r;
    } else if (c === ';' && r) {
      c = row[++i] = '';
    } else {
      row[i] += c;
    }
    p = c;
  }
  return row.map(s => s ? s.trim() : '');
}

async function handleCsvFileSelect(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(evt) {
    try {
      let content = evt.target.result;
      if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
      }

      const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        showToast("El archivo CSV no contiene registros suficientes.", "warning");
        return;
      }

      const headerRow = parseCsvLine(lines[0]).map(h => h.replace(/^["']|["']$/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''));
      
      // Encontrar índices de columnas
      const idIdx = headerRow.findIndex(h => h.includes('gameid') || h === 'id');
      const nameIdx = headerRow.findIndex(h => h === 'game' || h.includes('gamename') || h.includes('nombre'));
      const buyerIdx = headerRow.findIndex(h => h.includes('buyer') || h.includes('comprador'));
      const offerIdx = headerRow.findIndex(h => h === 'offer' || h.includes('oferta'));
      const counterIdx = headerRow.findIndex(h => h.includes('counter') || h.includes('contraoferta'));
      const incIdx = headerRow.findIndex(h => h.includes('increment') || h.includes('aumento'));
      const revIdx = headerRow.findIndex(h => h.includes('revis') || h.includes('revised'));
      const accIdx = headerRow.findIndex(h => h.includes('accept') || h.includes('sold') || h.includes('acept'));
      const currIdx = headerRow.findIndex(h => h.includes('currec') || h.includes('curren') || h.includes('moneda') || h.includes('divisa'));
      const priceIdx = headerRow.findIndex(h => h.includes('soldprice') || h.includes('precio'));

      if (idIdx === -1 && nameIdx === -1) {
        showToast("Formato de CSV no reconocido: falta columna GameID o Game.", "error");
        return;
      }

      const parseNumber = (val) => {
        if (!val) return null;
        const clean = val.replace(/^["']|["']$/g, '').replace(',', '.').trim();
        const num = parseFloat(clean);
        return isNaN(num) ? null : num;
      };

      const parseBool = (val) => {
        if (!val) return false;
        const clean = val.replace(/^["']|["']$/g, '').trim().toLowerCase();
        return clean === '1' || clean === 'true' || clean === 'si' || clean === 'sí' || clean === 'yes';
      };

      const rowsToImport = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCsvLine(lines[i]);
        if (cols.length === 0 || !cols.some(c => c.length > 0)) continue;

        const rawId = idIdx !== -1 && cols[idIdx] ? cols[idIdx].replace(/^["']|["']$/g, '').trim() : null;
        const gameId = rawId ? parseInt(rawId, 10) : null;
        const gameName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx].replace(/^["']|["']$/g, '').trim() : null;

        if (!gameId && !gameName) continue;

        const buyer = buyerIdx !== -1 && cols[buyerIdx] ? cols[buyerIdx].replace(/^["']|["']$/g, '').trim() : null;
        const offer = offerIdx !== -1 ? parseNumber(cols[offerIdx]) : null;
        const counterOffer = counterIdx !== -1 ? parseNumber(cols[counterIdx]) : null;
        const increment = incIdx !== -1 ? parseNumber(cols[incIdx]) : null;
        const revised = revIdx !== -1 ? parseBool(cols[revIdx]) : false;
        const accepted = accIdx !== -1 ? parseBool(cols[accIdx]) : false;
        const soldCurrency = currIdx !== -1 && cols[currIdx] ? cols[currIdx].replace(/^["']|["']$/g, '').trim().toUpperCase() : 'TF2';
        const soldPrice = priceIdx !== -1 ? parseNumber(cols[priceIdx]) : null;

        rowsToImport.push({
          game_id: gameId || 0,
          game_name: gameName,
          buyer: buyer,
          offer: offer,
          counter_offer: counterOffer,
          increment: increment,
          revised: revised,
          accepted: accepted,
          sold_currency: soldCurrency,
          sold_price: soldPrice
        });
      }

      if (rowsToImport.length === 0) {
        showToast("No se encontraron filas válidas en el archivo CSV.", "warning");
        return;
      }

      pendingImportRows = rowsToImport;

      // Calcular estadísticas previas
      const soldRows = rowsToImport.filter(r => r.accepted === true);
      const pendingRows = rowsToImport.filter(r => r.accepted === false && r.revised === true);
      const listedRows = rowsToImport.filter(r => r.accepted === false && r.revised === false);

      if (importStatTotalRows) importStatTotalRows.textContent = rowsToImport.length;
      if (importStatSoldCount) importStatSoldCount.textContent = soldRows.length;
      if (importStatPendingCount) importStatPendingCount.textContent = pendingRows.length;
      if (importStatListedCount) importStatListedCount.textContent = listedRows.length;

      // Generar vista previa con desglose
      if (importPreviewList) {
        importPreviewList.innerHTML = rowsToImport.map(r => {
          let badgeHtml = '';
          if (r.accepted === true) {
            const pVal = r.sold_price !== null ? r.sold_price : (r.counter_offer !== null ? r.counter_offer : r.offer);
            badgeHtml = `<span class="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold text-[10px]">Vendido: ${pVal} ${escapeHtml(r.sold_currency || 'TF2')}</span>`;
          } else if (r.revised === true) {
            const inc = r.increment !== null ? r.increment : 0;
            badgeHtml = `<span class="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold text-[10px]">Tramitado (+${inc} TF2)</span>`;
          } else {
            badgeHtml = `<span class="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-700 font-semibold text-[10px]">Listado</span>`;
          }

          return `
            <div class="flex items-center justify-between p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80 gap-2 hover:bg-slate-950 transition">
              <div class="flex items-center gap-2 truncate min-w-0">
                <span class="text-slate-500 font-mono font-bold text-[10px]">#${r.game_id}</span>
                <span class="text-slate-200 font-sans truncate font-medium text-xs">${escapeHtml(r.game_name || 'Juego')}</span>
                <span class="text-slate-500 text-[10px]">(${escapeHtml(r.buyer || 'xMjalino')})</span>
              </div>
              <div class="flex-shrink-0">
                ${badgeHtml}
              </div>
            </div>
          `;
        }).join('');
      }

      // Mostrar modal de confirmación
      if (modalConfirmImport) {
        modalConfirmImport.classList.remove('hidden');
        modalConfirmImport.classList.add('flex');
      }
    } catch (err) {
      console.error("Error parsing CSV", err);
      showToast("Error al leer y procesar el archivo CSV.", "error");
    }
  };

  reader.readAsText(file, 'UTF-8');
}

async function applyImportCsv() {
  if (!pendingImportRows || pendingImportRows.length === 0) {
    showToast("No hay registros pendientes de importar.", "warning");
    return;
  }

  if (btnApplyImportCsv) {
    btnApplyImportCsv.disabled = true;
    btnApplyImportCsv.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Aplicando...`;
  }

  try {
    const response = await fetch('/api/games/import-csv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: pendingImportRows })
    });

    const resData = await response.json();
    if (response.ok && resData.status === 'ok') {
      if (modalConfirmImport) {
        modalConfirmImport.classList.add('hidden');
        modalConfirmImport.classList.remove('flex');
      }
      pendingImportRows = [];
      showToast(`¡Se importaron y aplicaron ${resData.updated_count} cambios con éxito!`, "success");
      await initData();
    } else {
      showToast(resData.detail || 'Error al importar los datos del CSV.', "error");
    }
  } catch (err) {
    console.error("Error applying CSV import", err);
    showToast("Error al aplicar la importación de datos en el servidor.", "error");
  } finally {
    if (btnApplyImportCsv) {
      btnApplyImportCsv.disabled = false;
      btnApplyImportCsv.innerHTML = `<i class="fa-solid fa-check"></i> Aplicar e Importar Cambios`;
    }
  }
}

function showToast(msg, type = "success") {
  const toast = document.getElementById('toast-notify');
  const toastMsg = document.getElementById('toast-msg');
  const toastIcon = document.getElementById('toast-icon');
  const toastIconWrap = document.getElementById('toast-icon-wrap');
  if (!toast || !toastMsg) return;

  toastMsg.textContent = msg;

  if (type === "warning") {
    toastIcon.className = "fa-solid fa-triangle-exclamation text-amber-400/90";
    toastIconWrap.className = "p-1.5 bg-amber-950/40 rounded-lg flex-shrink-0 text-sm mt-0.5";
  } else if (type === "error") {
    toastIcon.className = "fa-solid fa-circle-xmark text-rose-400/90";
    toastIconWrap.className = "p-1.5 bg-rose-950/40 rounded-lg flex-shrink-0 text-sm mt-0.5";
  } else if (type === "info") {
    toastIcon.className = "fa-solid fa-circle-info text-slate-300";
    toastIconWrap.className = "p-1.5 bg-slate-800 rounded-lg flex-shrink-0 text-sm mt-0.5";
  } else {
    toastIcon.className = "fa-solid fa-circle-check text-emerald-400/90";
    toastIconWrap.className = "p-1.5 bg-emerald-950/40 rounded-lg flex-shrink-0 text-sm mt-0.5";
  }

  toast.classList.remove('translate-y-16', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100', 'pointer-events-auto');

  setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100', 'pointer-events-auto');
    toast.classList.add('translate-y-16', 'opacity-0', 'pointer-events-none');
  }, 3200);
}
