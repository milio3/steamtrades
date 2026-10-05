// Estado global de la aplicación
let gamesData = [];
let summaryData = {};
let tf2CashPrice = 1.62;
let tf2SteamPrice = 2.02;
let currentFilter = 'listed'; // 'listed' (por defecto), 'delisted', 'pending', 'sold', 'issue'
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
const tf2LastUpdate = document.getElementById('tf2-last-update');

const statTotalGames = document.getElementById('stat-total-games');
const statTotalKeys = document.getElementById('stat-total-keys');
const statCashValue = document.getElementById('stat-cash-value');
const statRealizedSales = document.getElementById('stat-realized-sales');
const statPotentialProfit = document.getElementById('stat-potential-profit');

const countDelisted = document.getElementById('count-delisted');
const countSold = document.getElementById('count-sold');
const countListed = document.getElementById('count-listed');
const countPending = document.getElementById('count-pending');
const countIssue = document.getElementById('count-issue');

// Botones de filtro
const filterListed = document.getElementById('filter-listed');
const filterPending = document.getElementById('filter-pending');
const filterSold = document.getElementById('filter-sold');
const filterDelisted = document.getElementById('filter-delisted');
const filterIssue = document.getElementById('filter-issue');

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
const editBuyerName = document.getElementById('edit-buyer-name');

// Selector de Estado, Incidencia y Venta
const editStatus = document.getElementById('edit-status');
const modalStatusBadge = document.getElementById('modal-status-badge');
const issueDetailsBox = document.getElementById('issue-details-box');
const editIssueNote = document.getElementById('edit-issue-note');
const soldDetailsBox = document.getElementById('sold-details-box');
const editSoldCurrency = document.getElementById('edit-sold-currency');
const editSoldPrice = document.getElementById('edit-sold-price');
const editSoldCurrencyLabel = document.getElementById('edit-sold-currency-label');
const editSoldNote = document.getElementById('edit-sold-note');

// Enlaces de Keyshops en el modal
const modalKeyshopLinks = document.getElementById('modal-keyshop-links');
const modalBestDealText = document.getElementById('modal-best-deal-text');

const editForm = document.getElementById('edit-form');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnDeleteGame = document.getElementById('btn-delete-game');

// Modal Añadir Juego
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const modalAddGame = document.getElementById('modal-add-game');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');
const btnCancelAdd = document.getElementById('btn-cancel-add');
const btnSubmitAdd = document.getElementById('btn-submit-add');
const inputSteamUrl = document.getElementById('input-steam-url');
const inputTf2Keys = document.getElementById('input-tf2-keys');
const inputBuyerName = document.getElementById('input-buyer-name');

const FALLBACK_GAME_SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDY0IDMyIiBmaWxsPSIjMWUyOTNiIj48cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iMzIiIHJ4PSI0Ii8+PHBhdGggZD0iTTI0IDEwaC0ydjRoLTR2Mmg0djRoMnYtNGg0di0yaC00di00em0xNCAyYTEuNSAxLjUgMCAxIDEtMyAwIDEuNSAxLjUgMCAwIDEgMyAwem00IDRhMS41IDEuNSAwIDEgMS0zIDAgMS41IDEuNSAwIDAgMSAzIDB6bS00IDRhMS41IDEuNSAwIDEgMS0zIDAgMS41IDEuNSAwIDAgMSAzIDB6bTQtOGExLjUgMS41IDAgMSAxLTMgMCAxLjUgMS41IDAgMCAxIDMgMHoiIGZpbGw9IiM2NDc0OGIiLz48L3N2Zz4=";

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Formateador inteligente de jugadores en 24h:
// - Hasta 1.000: número exacto (ej. 742)
// - 1.000 a 9.999: 1,25K (2 decimales con coma)
// - 10.000 a 99.999: 10,1K (1 decimal con coma)
// - A partir de 100.000: 100K (entero)
function formatPlayersCount(num) {
  if (typeof num !== 'number' || isNaN(num) || num <= 0) return '--';
  if (num < 1000) return num.toString();
  if (num < 10000) return (num / 1000).toFixed(2).replace('.', ',') + 'K';
  if (num < 100000) return (num / 1000).toFixed(1).replace('.', ',') + 'K';
  return Math.round(num / 1000) + 'K';
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
      renderGamesGrid();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderGamesGrid();
    });
  }

  if (filterListed) filterListed.addEventListener('click', () => setFilter('listed'));
  if (filterPending) filterPending.addEventListener('click', () => setFilter('pending'));
  if (filterSold) filterSold.addEventListener('click', () => setFilter('sold'));
  if (filterDelisted) filterDelisted.addEventListener('click', () => setFilter('delisted'));
  if (filterIssue) filterIssue.addEventListener('click', () => setFilter('issue'));

  if (btnSyncSteam) {
    btnSyncSteam.addEventListener('click', async () => {
      btnSyncSteam.disabled = true;
      btnSyncSteam.classList.add('hidden');
      if (syncProgressBar) {
        syncProgressBar.classList.remove('hidden');
        syncProgressBar.classList.add('flex');
        if (syncProgressMsg) syncProgressMsg.textContent = 'Iniciando sincronización...';
        if (syncProgressFill) syncProgressFill.style.width = '5%';
      }
      try {
        await fetch('/api/sync-steam', { method: 'POST' });
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

  if (btnDeleteGame) {
    btnDeleteGame.addEventListener('click', async () => {
      if (!selectedGameId) return;
      const curGame = gamesData.find(g => String(g.id) === String(selectedGameId));
      const gameName = curGame ? curGame.name : `ID ${selectedGameId}`;
      if (confirm(`¿Estás seguro de que deseas eliminar permanentemente "${gameName}" de la base de datos?`)) {
        btnDeleteGame.disabled = true;
        btnDeleteGame.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...`;
        try {
          const res = await fetch(`/api/games/${selectedGameId}`, { method: 'DELETE' });
          if (res.ok) {
            closeModal();
            await loadSummary();
            await loadGames();
          } else {
            alert("Error al eliminar el juego.");
          }
        } catch (err) {
          console.error("Error deleting game", err);
          alert("Error de conexión al eliminar.");
        } finally {
          btnDeleteGame.disabled = false;
          btnDeleteGame.innerHTML = `<i class="fa-solid fa-trash-can"></i> Eliminar`;
        }
      }
    });
  }

  // Cambio de estado en el modal
  if (editStatus) {
    editStatus.addEventListener('change', (e) => {
      updateModalStatusUI(e.target.value);
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

  // Variables de autocompletado en modal de añadir
  const searchSuggestionsDropdown = document.getElementById('search-suggestions-dropdown');
  const searchSpinner = document.getElementById('search-spinner');
  const addGamePreviewCard = document.getElementById('add-game-preview-card');
  const previewImg = document.getElementById('preview-img');
  const previewName = document.getElementById('preview-name');
  const previewAppId = document.getElementById('preview-appid');
  const previewPrice = document.getElementById('preview-price');
  let searchDebounceTimer = null;
  let selectedCandidateAppId = null;

  function resetAddModalForm() {
    if (inputSteamUrl) inputSteamUrl.value = '';
    if (inputTf2Keys) inputTf2Keys.value = '1.0';
    if (inputBuyerName) {
      inputBuyerName.value = '';
      inputBuyerName.placeholder = 'Comprador (opcional)';
    }
    selectedCandidateAppId = null;
    if (searchSuggestionsDropdown) {
      searchSuggestionsDropdown.innerHTML = '';
      searchSuggestionsDropdown.classList.add('hidden');
    }
    if (addGamePreviewCard) addGamePreviewCard.classList.add('hidden');
    if (searchSpinner) searchSpinner.classList.add('hidden');
  }

  function closeAddModal() {
    if (modalAddGame) {
      modalAddGame.classList.add('hidden');
      modalAddGame.classList.remove('flex');
      resetAddModalForm();
    }
  }

  if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

  // Búsqueda reactiva por nombre al escribir
  if (inputSteamUrl) {
    inputSteamUrl.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      clearTimeout(searchDebounceTimer);

      if (!val || val.length < 2 || val.includes('store.steampowered.com') || /^\d+$/.test(val)) {
        if (searchSuggestionsDropdown) searchSuggestionsDropdown.classList.add('hidden');
        if (searchSpinner) searchSpinner.classList.add('hidden');
        return;
      }

      if (searchSpinner) searchSpinner.classList.remove('hidden');

      searchDebounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/games/search?query=${encodeURIComponent(val)}`);
          if (res.ok) {
            const items = await res.json();
            renderSearchSuggestions(items);
          }
        } catch (err) {
          console.error("Error searching games", err);
        } finally {
          if (searchSpinner) searchSpinner.classList.add('hidden');
        }
      }, 300);
    });
  }

  function renderSearchSuggestions(items) {
    if (!searchSuggestionsDropdown) return;
    if (!items || items.length === 0) {
      searchSuggestionsDropdown.innerHTML = `<div class="p-2.5 text-slate-400 text-center">No se encontraron juegos en Steam</div>`;
      searchSuggestionsDropdown.classList.remove('hidden');
      return;
    }

    searchSuggestionsDropdown.innerHTML = items.map(item => `
      <div class="suggestion-item p-2 hover:bg-slate-800 cursor-pointer flex items-center gap-2.5 transition" 
           data-appid="${item.app_id}" data-name="${escapeHtml(item.name)}" data-img="${item.header_image || ''}" data-price="${item.price_eur !== null ? item.price_eur.toFixed(2) + ' €' : 'Gratis / N/D'}">
        <img src="${item.tiny_image || ''}" class="w-12 h-6 object-cover rounded shadow flex-shrink-0" onerror="this.src='${FALLBACK_GAME_SVG}'">
        <div class="flex-1 min-w-0">
          <div class="font-bold text-slate-200 truncate">${escapeHtml(item.name)}</div>
          <div class="text-[10px] text-slate-400 font-mono flex items-center gap-2">
            <span>AppID: ${item.app_id}</span>
            <span class="text-emerald-400">${item.price_eur !== null ? item.price_eur.toFixed(2) + ' €' : 'Gratis'}</span>
          </div>
        </div>
      </div>
    `).join('');

    searchSuggestionsDropdown.classList.remove('hidden');

    searchSuggestionsDropdown.querySelectorAll('.suggestion-item').forEach(el => {
      el.addEventListener('click', () => {
        const appid = el.getAttribute('data-appid');
        const name = el.getAttribute('data-name');
        const img = el.getAttribute('data-img');
        const price = el.getAttribute('data-price');

        inputSteamUrl.value = name;
        selectedCandidateAppId = appid;

        if (addGamePreviewCard) {
          if (previewImg) previewImg.src = img;
          if (previewName) previewName.textContent = name;
          if (previewAppId) previewAppId.textContent = `AppID: ${appid}`;
          if (previewPrice) previewPrice.textContent = price;
          addGamePreviewCard.classList.remove('hidden');
        }

        searchSuggestionsDropdown.classList.add('hidden');
      });
    });
  }

  // Modal Añadir Juego
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      if (modalAddGame) {
        modalAddGame.classList.remove('hidden');
        modalAddGame.classList.add('flex');
        resetAddModalForm();
        if (inputSteamUrl) inputSteamUrl.focus();
      }
    });
  }

  if (btnSubmitAdd) {
    btnSubmitAdd.addEventListener('click', async () => {
      const rawVal = inputSteamUrl ? inputSteamUrl.value.trim() : '';
      const keys = inputTf2Keys && inputTf2Keys.value ? parseFloat(inputTf2Keys.value) : 1.0;
      const buyer = inputBuyerName && inputBuyerName.value.trim() ? inputBuyerName.value.trim() : null;
      if (!rawVal) return;

      const payloadQuery = selectedCandidateAppId || rawVal;
      btnSubmitAdd.disabled = true;
      btnSubmitAdd.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Añadiendo...`;
      try {
        const res = await fetch('/api/games/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: payloadQuery, steam_url: payloadQuery, tf2_keys_offered: keys, offer_price: keys, buyer_name: buyer })
        });
        if (res.ok) {
          closeAddModal();
          await loadSummary();
          await loadGames();
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.detail || "Error al añadir el juego. Verifica el nombre o enlace.");
        }
      } catch (err) {
        console.error("Error adding game", err);
        alert("Error de conexión al añadir juego.");
      } finally {
        btnSubmitAdd.disabled = false;
        btnSubmitAdd.innerHTML = `<i class="fa-solid fa-plus"></i> Añadir y Calcular`;
      }
    });
  }

}

function updateModalStatusUI(statusVal) {
  if (issueDetailsBox) {
    if (statusVal === 'issue') {
      issueDetailsBox.classList.remove('hidden');
      if (editIssueNote && !editIssueNote.value) {
        const curGame = gamesData.find(g => String(g.id) === String(selectedGameId));
        if (curGame && curGame.issue_note) editIssueNote.value = curGame.issue_note;
      }
    } else {
      issueDetailsBox.classList.add('hidden');
    }
  }

  if (soldDetailsBox) {
    if (statusVal === 'sold') {
      soldDetailsBox.classList.remove('hidden');
      if (editSoldPrice && !editSoldPrice.value) {
        const curGame = gamesData.find(g => String(g.id) === String(selectedGameId));
        if (curGame) editSoldPrice.value = curGame.tf2_keys_offered;
      }
    } else {
      soldDetailsBox.classList.add('hidden');
    }
  }

  if (modalStatusBadge) {
    if (statusVal === 'listed') {
      modalStatusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300 border border-slate-600';
      modalStatusBadge.textContent = 'Listado';
    } else if (statusVal === 'sold') {
      modalStatusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950 text-emerald-300 border border-emerald-600';
      modalStatusBadge.textContent = 'Vendido';
    } else if (statusVal === 'issue') {
      modalStatusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-rose-950 text-rose-300 border border-rose-600';
      modalStatusBadge.textContent = 'Incidencia';
    } else {
      modalStatusBadge.className = 'text-[10px] px-2 py-0.5 rounded font-bold bg-purple-950 text-purple-300 border border-purple-600';
      modalStatusBadge.textContent = 'Tramitado';
    }
  }
}

function setFilter(filter) {
  currentFilter = filter;
  [filterListed, filterDelisted, filterPending, filterSold, filterIssue].forEach(btn => {
    if (btn) btn.classList.remove('active');
  });

  if (filter === 'listed' && filterListed) filterListed.classList.add('active');
  else if (filter === 'delisted' && filterDelisted) filterDelisted.classList.add('active');
  else if (filter === 'pending' && filterPending) filterPending.classList.add('active');
  else if (filter === 'sold' && filterSold) filterSold.classList.add('active');
  else if (filter === 'issue' && filterIssue) filterIssue.classList.add('active');

  renderGamesGrid();
}

async function loadSummary() {
  try {
    const res = await fetch('/api/summary');
    summaryData = await res.json();

    if (typeof summaryData.tf2_steam_price === 'number') {
      tf2SteamPrice = summaryData.tf2_steam_price;
      if (tf2LiveBadge) tf2LiveBadge.textContent = `${tf2SteamPrice.toFixed(2)} €`;
    }
    if (typeof summaryData.tf2_cash_price === 'number') {
      tf2CashPrice = summaryData.tf2_cash_price;
      if (tf2CashBadge) tf2CashBadge.textContent = `${tf2CashPrice.toFixed(2)} €`;
    }

    if (tf2LastUpdate) {
      if (summaryData.last_tf2_update) {
        tf2LastUpdate.textContent = `(${summaryData.last_tf2_update})`;
        tf2LastUpdate.title = `Última cotización oficial: ${summaryData.last_tf2_update}`;
      } else {
        tf2LastUpdate.textContent = '';
      }
    }

    // 1. Total Juegos
    if (statTotalGames) statTotalGames.textContent = summaryData.total_games || 0;
    
    // 2. Oferta Activa (TF2 Keys)
    if (statTotalKeys) {
      const activeKeys = summaryData.active_keys_tf2 !== undefined ? summaryData.active_keys_tf2 : summaryData.total_keys;
      statTotalKeys.textContent = Number(activeKeys || 0).toFixed(2);
    }
    
    // 3. Oferta Activa en Dinero Real (€ Cash)
    if (statCashValue) {
      const activeCash = summaryData.active_offer_cash_eur !== undefined ? summaryData.active_offer_cash_eur : summaryData.total_offer_cash_eur;
      statCashValue.textContent = `${Number(activeCash || 0).toFixed(2)} €`;
    }
    
    // 4. Saldo Realizado de Ventas (€)
    if (statRealizedSales) {
      const realized = summaryData.realized_sales_eur !== undefined ? summaryData.realized_sales_eur : 0.0;
      statRealizedSales.textContent = `${Number(realized || 0).toFixed(2)} €`;
    }
    
    // 5. Beneficio Potencial Activo (€)
    if (statPotentialProfit) {
      const potProfit = summaryData.potential_profit_eur !== undefined ? summaryData.potential_profit_eur : (summaryData.total_reseller_profit_eur || 0.0);
      statPotentialProfit.textContent = `+${Number(potProfit || 0).toFixed(2)} €`;
    }
    
    // Conteo por etiquetas
    if (countDelisted) countDelisted.textContent = summaryData.delisted_count || 0;
    if (countSold) countSold.textContent = summaryData.sold_count || 0;
    if (countListed) countListed.textContent = summaryData.listed_count || 0;
    if (countPending) countPending.textContent = summaryData.pending_count || 0;
    if (countIssue) countIssue.textContent = summaryData.issue_count || 0;
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

function getGameEffectiveStatus(g) {
  if (g.status === 'issue') return 'issue';
  if (g.is_sold || g.status === 'sold') return 'sold';
  if (g.status === 'listed') return 'listed';
  return 'pending';
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

  // 2. Filtros de Estado y Categoría
  if (currentFilter === 'all') {
    // "Todos" muestra el catálogo activo de negociación (excluye Vendidos e Incidencias)
    filtered = filtered.filter(g => !['sold', 'issue'].includes(getGameEffectiveStatus(g)));
  } else if (currentFilter === 'listed') {
    filtered = filtered.filter(g => getGameEffectiveStatus(g) === 'listed');
  } else if (currentFilter === 'pending') {
    filtered = filtered.filter(g => getGameEffectiveStatus(g) === 'pending');
  } else if (currentFilter === 'sold') {
    filtered = filtered.filter(g => getGameEffectiveStatus(g) === 'sold');
  } else if (currentFilter === 'issue') {
    filtered = filtered.filter(g => getGameEffectiveStatus(g) === 'issue');
  } else if (currentFilter === 'delisted') {
    filtered = filtered.filter(g => g.is_delisted_steam && !['sold', 'issue'].includes(getGameEffectiveStatus(g)));
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

    const effStatus = getGameEffectiveStatus(game);
    const isSold = effStatus === 'sold';
    const isIssue = effStatus === 'issue';

    const lossEur = (typeof game.seller_loss_eur === 'number') ? game.seller_loss_eur : null;
    const floorPrice = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : null;
    const floorSource = game.floor_price_source || 'Suelo Mínimo';

    let lossBadgeHtml = '';
    if (lossEur !== null && floorPrice !== null && floorPrice > 0) {
      if (lossEur > 0) {
        const lossPct = (lossEur / floorPrice) * 100;
        lossBadgeHtml = `
          <div class="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs space-y-1">
            <div class="flex justify-between items-center font-bold text-xs">
              <span class="flex items-center gap-1.5 text-rose-300" title="Suelo de mercado: ${floorPrice.toFixed(2)}€ (${floorSource})">
                <i class="fa-solid fa-arrow-trend-down text-rose-400 text-sm"></i> Dejas de ganar:
              </span>
              <span class="text-xs font-black text-rose-400 font-mono">+${lossEur.toFixed(2)} € (${lossPct.toFixed(1)}%)</span>
            </div>
            <div class="text-[11px] text-right text-slate-300 flex justify-between font-mono">
              <span>Suelo: ${floorPrice.toFixed(2)}€</span>
              <span class="italic text-[10px] truncate max-w-[140px] font-sans text-slate-400">${floorSource}</span>
            </div>
          </div>
        `;
      } else {
        const gainEur = Math.abs(lossEur);
        lossBadgeHtml = `
          <div class="bg-emerald-950/60 border border-emerald-800/50 p-2.5 rounded-xl text-xs space-y-1 text-emerald-300">
            <div class="flex justify-between items-center font-bold text-xs">
              <span class="flex items-center gap-1.5">
                <i class="fa-solid fa-check-circle text-emerald-400 text-sm"></i> Trato favorable:
              </span>
              <span class="text-xs font-black text-emerald-300 font-mono">+${gainEur.toFixed(2)} € sobre suelo</span>
            </div>
            <div class="text-[11px] text-right text-emerald-400/90 flex justify-between font-mono">
              <span>Suelo: ${floorPrice.toFixed(2)}€</span>
              <span class="font-semibold text-[10px] font-sans">¡Pagan por encima del suelo!</span>
            </div>
          </div>
        `;
      }
    } else {
      lossBadgeHtml = `
        <div class="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs text-slate-400 text-center font-medium">
          Cotización de suelo pendiente
        </div>
      `;
    }

    // Etiquetas abajo a la izquierda: 1º Estado (Listado / Tramitado / Vendido / Incidencia), 2º Coleccionista
    let statusBadgeHtml = '';
    if (effStatus === 'listed') {
      statusBadgeHtml = `
        <span class="bg-slate-800/90 border border-slate-600 text-slate-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm" title="Publicado en SteamTrades sin oferta">
          <i class="fa-solid fa-tag text-[10px] text-slate-400"></i> Listado
        </span>
      `;
    } else if (effStatus === 'pending') {
      statusBadgeHtml = `
        <span class="bg-purple-950/90 border border-purple-600/80 text-purple-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm" title="Oferta recibida / En revisión / Esperando respuesta">
          <i class="fa-solid fa-clock text-[10px] text-purple-400"></i> Tramitado
        </span>
      `;
    } else if (effStatus === 'sold') {
      statusBadgeHtml = `
        <span class="bg-emerald-950/90 border border-emerald-600/80 text-emerald-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm" title="Trato cerrado y cobrado">
          <i class="fa-solid fa-check text-[10px] text-emerald-400"></i> Vendido
        </span>
      `;
    } else if (effStatus === 'issue') {
      statusBadgeHtml = `
        <span class="bg-rose-950/90 border border-rose-600/80 text-rose-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm" title="Incidencia registrada: ${escapeHtml(game.issue_note || '')}">
          <i class="fa-solid fa-circle-exclamation text-[10px] text-rose-400"></i> Incidencia
        </span>
      `;
    }

    const delistedBadge = game.is_delisted_steam ? `
      <span class="bg-amber-950/80 border border-amber-600/70 text-amber-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-sm" title="${game.delisted_reason || 'Juego retirado de la tienda oficial de Steam (Artículo de Coleccionista)'}">
        <i class="fa-solid fa-crown text-amber-400 text-[10px]"></i> Coleccionista
      </span>
    ` : '';

    const headerImage = game.steam_header_image || FALLBACK_GAME_SVG;
    const safeName = escapeHtml(game.name);

    // Precios Actuales
    const curOfficialNum = (typeof game.ggdeals_current_official === 'number') ? game.ggdeals_current_official : ((typeof game.steam_store_price === 'number') ? game.steam_store_price : null);
    const curOfficialStr = curOfficialNum !== null ? `${curOfficialNum.toFixed(2)}€` : (game.is_delisted_steam ? '<span class="text-amber-400 font-semibold font-sans text-[9px]">Coleccionista</span>' : '<span class="text-slate-600">N/D</span>');

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

    // Sección Central: Incidencia vs Panel de Venta vs Tabla de Precios
    let centralContentHtml = '';

    if (isIssue) {
      const issueDesc = game.issue_note ? escapeHtml(game.issue_note) : 'Incidencia registrada sin motivo especificado.';
      centralContentHtml = `
        <!-- Panel de Incidencia Registrada -->
        <div class="bg-rose-950/30 border border-rose-800/70 rounded-xl p-2.5 flex-1 flex flex-col justify-center space-y-1.5 shadow-sm">
          <div class="flex items-center justify-between border-b border-rose-900/60 pb-1">
            <span class="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <i class="fa-solid fa-circle-exclamation text-rose-400 text-sm"></i> Incidencia / Problema
            </span>
            <span class="text-xs bg-rose-950 text-rose-200 border border-rose-700/80 px-2 py-0.5 rounded font-bold font-mono">Bloqueada</span>
          </div>
          <p class="text-xs text-rose-100 font-semibold line-clamp-3 italic pt-0.5" title="${issueDesc}">
            "${issueDesc}"
          </p>
        </div>
      `;
    } else if (isSold) {
      const isSoldEur = game.sold_currency === 'EUR';
      const priceVal = game.sold_price !== null && game.sold_price !== undefined ? Number(game.sold_price) : Number(game.sold_tf2_keys || game.tf2_keys_offered);
      const noteText = game.sold_note ? escapeHtml(game.sold_note) : '';

      let priceDisplay = '';
      let conversionDisplay = '';
      let soldEur = 0;

      if (isSoldEur) {
        soldEur = priceVal;
        priceDisplay = `${soldEur.toFixed(2)} €`;
        const equivKeysCash = tf2CashPrice > 0 ? (soldEur / tf2CashPrice) : 0;
        conversionDisplay = `~${equivKeysCash.toFixed(2)} TF2 (Cash)`;
      } else {
        const soldKeys = priceVal;
        priceDisplay = `${soldKeys} TF2`;
        soldEur = soldKeys * tf2CashPrice;
        const soldSteamEur = soldKeys * tf2SteamPrice;
        conversionDisplay = `~${soldEur.toFixed(2)}€ Cash | ~${soldSteamEur.toFixed(2)}€ Steam`;
      }

      // 1. Comparativa vs Suelo de Mercado
      const floorP = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : 0;
      const profitEur = soldEur - floorP;
      const profitPct = floorP > 0 ? ((profitEur / floorP) * 100) : 0;
      const isFavorable = profitEur >= 0;

      // 2. Comparativa vs Oferta Inicial Recibida
      const origKeys = Number(game.tf2_keys_offered) || 0;
      const origOfferCashEur = origKeys * tf2CashPrice;
      const profitVsOfferEur = soldEur - origOfferCashEur;
      const profitVsOfferPct = origOfferCashEur > 0 ? ((profitVsOfferEur / origOfferCashEur) * 100) : 0;
      const improvedOffer = profitVsOfferEur > 0.01;
      const sameOffer = Math.abs(profitVsOfferEur) <= 0.01;

      centralContentHtml = `
        <!-- Panel Unificado de Venta & Rentabilidad Dual -->
        <div class="bg-slate-950/90 border ${isFavorable ? 'border-emerald-800/60' : 'border-rose-800/60'} rounded-xl p-2.5 flex-1 flex flex-col justify-between space-y-2 shadow-sm">
          <!-- Cabecera de Venta -->
          <div class="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div>
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block">Precio de Venta</span>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span class="text-lg font-black text-emerald-400 font-mono">${priceDisplay}</span>
                ${noteText ? `<span class="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold px-2 py-0.5 rounded-md flex items-center gap-1" title="Nota: ${noteText}"><i class="fa-solid fa-receipt text-xs text-emerald-400"></i> ${noteText}</span>` : ''}
              </div>
            </div>
            <div class="text-right">
              <span class="text-xs font-bold text-slate-300 uppercase tracking-wider block">Valor al Cambio</span>
              <span class="text-xs font-mono font-bold text-slate-100 mt-0.5 block">${conversionDisplay}</span>
            </div>
          </div>

          <!-- Métricas de Rentabilidad: vs Oferta y vs Suelo -->
          <div class="space-y-1.5">
            <!-- vs Oferta Inicial Recibida -->
            <div class="bg-slate-900/90 border border-slate-800 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-xs">
              <span class="text-slate-300 text-xs font-semibold flex items-center gap-1.5">
                <i class="fa-solid fa-hand-holding-dollar text-amber-400 text-xs"></i> vs Oferta inicial (${origKeys} TF2):
              </span>
              <div class="text-right font-mono text-xs font-bold">
                ${improvedOffer ? `
                  <span class="text-emerald-400">+${profitVsOfferEur.toFixed(2)} € (+${profitVsOfferPct.toFixed(1)}%)</span>
                ` : sameOffer ? `
                  <span class="text-slate-200">0.00 € (Aceptada)</span>
                ` : `
                  <span class="text-rose-400">${profitVsOfferEur.toFixed(2)} € (${profitVsOfferPct.toFixed(1)}%)</span>
                `}
              </div>
            </div>

            <!-- vs Suelo de Mercado -->
            <div class="${isFavorable ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300' : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'} px-2.5 py-1.5 rounded-lg flex items-center justify-between text-xs">
              <div>
                <div class="flex items-center gap-1.5 font-bold text-xs">
                  <i class="fa-solid ${isFavorable ? 'fa-circle-check text-emerald-400' : 'fa-circle-exclamation text-rose-400'} text-xs"></i>
                  <span>${isFavorable ? 'Trato Favorable' : 'Trato Desfavorable'}</span>
                </div>
                <div class="text-xs text-slate-300 font-mono mt-0.5">
                  Suelo: ${floorP.toFixed(2)}€
                </div>
              </div>
              <div class="text-right font-mono">
                <span class="text-xs font-black ${isFavorable ? 'text-emerald-300' : 'text-rose-300'} block">
                  ${isFavorable ? '+' : ''}${profitEur.toFixed(2)} €
                </span>
                <span class="text-xs font-bold ${isFavorable ? 'text-emerald-400' : 'text-rose-400'} block">
                  ${isFavorable ? '+' : ''}${profitPct.toFixed(1)}% sobre suelo
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      centralContentHtml = `
        <!-- Tabla Unificada Transpuesta: Actual vs Mínimo con columna dedicada de Descuento -->
        <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1.5">
          <!-- Cabecera de 4 columnas -->
          <div class="grid grid-cols-4 text-xs font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800/80 pb-1">
            <span>Tipo</span>
            <span class="text-center">Oficial</span>
            <span class="text-center">Keyshops</span>
            <span class="text-right">Dto.</span>
          </div>

          <!-- Fila Actual -->
          <div class="grid grid-cols-4 items-center text-xs font-mono py-0.5">
            <span class="text-xs uppercase font-semibold text-slate-300 font-sans">Actual</span>
            <span class="text-center font-bold text-white">${curOfficialStr}</span>
            <span class="text-center font-bold text-slate-100">${curKeyshopStr}</span>
            <div class="text-right">
              ${curKeyshopDiscount ? `<span class="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-bold text-xs">${curKeyshopDiscount}</span>` : '<span class="text-slate-600 font-mono text-xs">--</span>'}
            </div>
          </div>

          <!-- Fila Mínimo Histórico -->
          <div class="grid grid-cols-4 items-center text-xs font-mono py-0.5">
            <span class="text-xs uppercase font-semibold text-slate-300 font-sans" title="Mínimo Histórico">Mínimo</span>
            <span class="text-center font-medium text-slate-200" title="${game.ggdeals_historical_official_time || ''}">${histOfficialStr}</span>
            <span class="text-center font-medium text-slate-200" title="${game.ggdeals_historical_keyshop_time || ''}">${histKeyshopStr}</span>
            <div class="text-right">
              ${histKeyshopDiscount ? `<span class="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded font-sans font-bold text-xs">${histKeyshopDiscount}</span>` : '<span class="text-slate-600 font-mono text-xs">--</span>'}
            </div>
          </div>
        </div>

        <!-- Rentabilidad y Suelo de Mercado -->
        <div>
          ${lossBadgeHtml}
        </div>
      `;
    }

    const formattedPlayers = formatPlayersCount(game.steam_players_24h);

    const platformBadgeHtml = (game.platform && game.platform !== 'STEAM') ? `
      <div class="absolute top-1.5 left-1.5 z-10">
        <span class="bg-cyan-950/90 backdrop-blur border border-cyan-600/80 text-cyan-200 text-xs font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-md" title="Plataforma: ${escapeHtml(game.platform)}">
          <i class="fa-solid fa-gamepad text-xs"></i>
          <span>${escapeHtml(game.platform)}</span>
        </span>
      </div>
    ` : '';

    card.innerHTML = `
      <!-- Banner / Imagen Clickable para Editar -->
      <div onclick="openEditModal('${game.id}')" title="Haz clic en la imagen para editar cotización y datos" 
           class="relative h-28 bg-slate-950 overflow-hidden group cursor-pointer border-b border-slate-800/80 transition duration-300 hover:ring-2 hover:ring-blue-500/40">
        <img src="${headerImage}" alt="${safeName}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='${FALLBACK_GAME_SVG}'">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent"></div>
        
        <!-- Badge flotante izquierda (Plataforma si no es Steam) -->
        ${platformBadgeHtml}

        <!-- Badge flotante derecha (Comprador) -->
        ${game.buyer_name ? `
          <div class="absolute top-1.5 right-1.5 z-10">
            <span class="bg-indigo-950/90 backdrop-blur border border-indigo-600/80 text-indigo-200 text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 shadow-md" title="Comprador: ${escapeHtml(game.buyer_name)}">
              <i class="fa-solid fa-user text-indigo-400 text-xs"></i>
              <span>${escapeHtml(game.buyer_name)}</span>
            </span>
          </div>
        ` : ''}

        <div class="absolute bottom-2 left-2.5 right-2.5">
          <h2 class="text-sm font-bold text-white line-clamp-2 leading-tight drop-shadow group-hover:text-blue-300 transition" title="${safeName}">
            ${safeName}
          </h2>
        </div>
      </div>

      <!-- Contenido de la Ficha Compacto y Homogéneo -->
      <div class="p-3 space-y-2.5 flex-1 flex flex-col justify-between">

        <!-- Caja de Oferta Recibida (Valor al lado de oferta y precios Steam/Cash a la derecha) -->
        <div class="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between text-xs">
          <div class="flex items-center gap-1.5 font-bold">
            <span class="text-slate-300 font-semibold flex items-center gap-1.5 text-xs">
              <i class="fa-solid fa-hand-holding-dollar text-amber-400 text-sm"></i> Oferta:
            </span>
            <span class="text-amber-300 text-base font-black font-mono">${game.tf2_keys_offered} TF2</span>
          </div>
          <div class="text-right text-xs font-mono font-medium text-slate-300 flex items-center gap-1.5">
            <span class="text-slate-200 font-semibold">~${offerSteamEur.toFixed(2)}€ Steam</span>
            <span class="text-slate-600">|</span>
            <span class="text-emerald-400 font-bold">~${offerCashEur.toFixed(2)}€ Cash</span>
          </div>
        </div>

        <!-- Sección Central Dinámica (Vendido vs Precios) -->
        ${centralContentHtml}

        <!-- Barra Inferior: Tags abajo a la izquierda | Enlaces al medio | Jugadores a la derecha -->
        <div class="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs text-slate-300 gap-2">
          
          <!-- Etiquetas abajo a la izquierda (1º Estado, 2º Delisted) -->
          <div class="flex items-center gap-1.5 flex-shrink-0">
            ${statusBadgeHtml}
            ${delistedBadge}
          </div>

          <!-- Enlaces Rápidos de Verificación (Steam, SteamDB, GG.deals) -->
          <div class="flex items-center space-x-2.5 text-xs">
            ${game.steam_app_id ? `
              <a href="https://store.steampowered.com/app/${game.steam_app_id}" target="_blank" class="hover:text-white transition flex items-center gap-1 font-semibold text-slate-300" title="Ver en Steam Store">
                <i class="fa-brands fa-steam text-sm"></i>
                <span>Steam</span>
              </a>
              <a href="https://steamdb.info/app/${game.steam_app_id}/" target="_blank" class="hover:text-white transition flex items-center gap-1 font-semibold text-slate-300" title="Ver en SteamDB">
                <i class="fa-solid fa-chart-simple text-xs"></i>
                <span>SteamDB</span>
              </a>
            ` : ''}
            <a href="https://gg.deals/games/?title=${encodeURIComponent(game.name)}" target="_blank" class="hover:text-white transition flex items-center gap-1 font-bold text-slate-300" title="Ver en GG.deals">
              <i class="fa-solid fa-tags text-xs"></i>
              <span>GG.deals</span>
            </a>
          </div>

          <!-- Jugadores en las últimas 24h a la DERECHA DEL TODO con formato inteligente (K) -->
          <div class="flex items-center justify-end min-w-[58px] flex-shrink-0 text-right">
            <span class="text-xs text-slate-200 font-mono font-bold flex items-center gap-1" title="Jugadores activos en Steam (últimas 24h): ${typeof game.steam_players_24h === 'number' ? game.steam_players_24h.toLocaleString() : 'N/D'}">
              <i class="fa-solid fa-users text-slate-400 text-xs"></i>
              <span>${formattedPlayers}</span>
            </span>
          </div>

        </div>
      </div>
    `;

    gamesGrid.appendChild(card);
  });
}

function openEditModal(gameId) {
  selectedGameId = gameId;
  const game = gamesData.find(g => String(g.id) === String(gameId));
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
  if (editBuyerName) editBuyerName.value = game.buyer_name || '';
  if (editIssueNote) editIssueNote.value = game.issue_note || '';

  // Estado del juego
  const effStatus = getGameEffectiveStatus(game);
  if (editStatus) editStatus.value = effStatus;
  updateModalStatusUI(effStatus);

  // Datos de venta
  const isSold = effStatus === 'sold';
  const curCurrency = game.sold_currency || 'TF2';
  if (editSoldCurrency) editSoldCurrency.value = curCurrency;
  if (editSoldCurrencyLabel) editSoldCurrencyLabel.textContent = curCurrency === 'EUR' ? '€' : 'TF2';
  if (editSoldPrice) {
    editSoldPrice.step = curCurrency === 'EUR' ? '0.01' : '0.25';
    const initVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || (isSold ? game.tf2_keys_offered : ''));
    editSoldPrice.value = initVal;
  }
  if (editSoldNote) editSoldNote.value = game.sold_note || '';
  if (modalKeyshopLinks) {
    const qName = encodeURIComponent(game.name);
    const kinguinText = "Kinguin (ROW)" + (game.kinguin_price_eur ? ` (${game.kinguin_price_eur.toFixed(2)}€)` : '');

    const platforms = [
      { name: "Eneba", url: `https://www.eneba.com/store/all?text=${qName}&regions[]=global&types[]=game`, icon: "fa-tag", color: "text-amber-400 hover:text-amber-300" },
      { name: kinguinText, url: game.kinguin_url || `https://www.kinguin.net/listing?active=1&hide_out_of_stock=1&phrase=${qName}&platform=Steam&region=Global`, icon: "fa-crown", color: "text-orange-400 hover:text-orange-300" },
      { name: "G2A", url: `https://www.g2a.com/search?query=${qName}+Steam+Key+Global`, icon: "fa-gamepad", color: "text-blue-400 hover:text-blue-300" },
      { name: "CDKeys", url: `https://www.cdkeys.com/?q=${qName}`, icon: "fa-key", color: "text-emerald-400 hover:text-emerald-300" },
      { name: "Gamivo", url: `https://www.gamivo.com/search/${qName}`, icon: "fa-bag-shopping", color: "text-rose-400 hover:text-rose-300" },
      { name: "Driffle", url: `https://driffle.com/search?keyword=${qName}`, icon: "fa-shield", color: "text-purple-400 hover:text-purple-300" }
    ];


    modalKeyshopLinks.innerHTML = platforms.map(p => `
      <a href="${p.url}" target="_blank" class="bg-slate-900 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition font-semibold ${p.color}">
        <i class="fa-solid ${p.icon} text-[10px]"></i>
        <span>${p.name}</span>
      </a>
    `).join('');
  }

  if (modalBestDealText) {
    if (game.best_keyshop_name && typeof game.best_keyshop_price_eur === 'number') {
      modalBestDealText.textContent = `Mejor: ${game.best_keyshop_name} (${game.best_keyshop_price_eur.toFixed(2)}€)`;
    } else {
      modalBestDealText.textContent = '';
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

  const currentStatusVal = editStatus ? editStatus.value : 'pending';
  const isSold = currentStatusVal === 'sold';
  const isIssue = currentStatusVal === 'issue';
  const soldCurr = editSoldCurrency ? editSoldCurrency.value : 'TF2';
  const soldPriceVal = isSold && editSoldPrice && editSoldPrice.value ? parseFloat(editSoldPrice.value) : null;
  const soldNoteVal = isSold && editSoldNote && editSoldNote.value.trim() ? editSoldNote.value.trim() : null;
  const issueNoteVal = isIssue && editIssueNote && editIssueNote.value.trim() ? editIssueNote.value.trim() : null;
  const buyer = editBuyerName && editBuyerName.value.trim() ? editBuyerName.value.trim() : null;

  const payload = {
    tf2_keys_offered: parseFloat(editTf2Keys.value) || 0,
    offer_price: parseFloat(editTf2Keys.value) || 0,
    best_keyshop_price_eur: editKeyshopPrice.value ? parseFloat(editKeyshopPrice.value) : null,
    ggdeals_current_official: editOfficialPrice.value ? parseFloat(editOfficialPrice.value) : null,
    ggdeals_historical_keyshop_low: editHistKeyshop.value ? parseFloat(editHistKeyshop.value) : null,
    ggdeals_historical_official_low: editHistOfficial.value ? parseFloat(editHistOfficial.value) : null,
    status: currentStatusVal,
    is_sold: isSold,
    sold_currency: soldCurr,
    sold_price: soldPriceVal,
    sold_tf2_keys: soldCurr === 'TF2' ? soldPriceVal : null,
    sold_note: soldNoteVal,
    issue_note: issueNoteVal,
    buyer_name: buyer
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

async function deleteCurrentGame() {
  if (!selectedGameId) return;
  const curGame = gamesData.find(g => String(g.id) === String(selectedGameId));
  const name = curGame ? curGame.name : 'este juego';

  if (!confirm(`¿Estás seguro de que deseas eliminar "${name}" permanentemente?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/games/${selectedGameId}`, {
      method: 'DELETE'
    });

    if (res.ok) {
      closeModal();
      await loadSummary();
      await loadGames();
    } else {
      alert("Error al eliminar el juego");
    }
  } catch (err) {
    console.error("Error deleting game", err);
    alert("Error al conectar con el servidor.");
  }
}

function checkSyncStatusLoop() {
  setInterval(async () => {
    try {
      const res = await fetch('/api/sync-status');
      const status = await res.json();
      if (status.is_syncing) {
        if (syncProgressBar) {
          syncProgressBar.classList.remove('hidden');
          syncProgressBar.classList.add('flex');
        }
        if (btnSyncSteam) btnSyncSteam.classList.add('hidden');
        if (syncProgressMsg) syncProgressMsg.textContent = status.message || 'Sincronizando...';
        if (syncProgressFill) {
          const pct = (status.current / Math.max(1, status.total)) * 100;
          syncProgressFill.style.width = `${Math.max(5, pct)}%`;
        }
      } else {
        if (syncProgressBar && !syncProgressBar.classList.contains('hidden')) {
          syncProgressBar.classList.add('hidden');
          syncProgressBar.classList.remove('flex');
          if (btnSyncSteam) {
            btnSyncSteam.classList.remove('hidden');
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
