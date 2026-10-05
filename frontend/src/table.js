// Estado de la tabla y paginación
const PAGE_SIZE = 15;
let currentPage = 1;
let games = [];
let allGamesList = [];
let currentTableFilter = 'listed';
let tf2CashPrice = 1.62;
let tf2SteamPrice = 2.02;
let keyIncreases = {}; // Map: gameId -> float (incremento de llaves)
let selectedGameId = null;

// Estado de ordenación de la tabla
let currentTableSort = { field: 'id', order: 'asc' };

const tableBody = document.getElementById('table-body');
const tableHead = document.getElementById('table-head');
const searchInput = document.getElementById('search-table-input');
const tf2LiveBadge = document.getElementById('tf2-live-badge');
const tf2CashBadge = document.getElementById('tf2-cash-badge');
const tf2LiveBadgeFooter = document.getElementById('tf2-live-badge-footer');
const tf2CashBadgeFooter = document.getElementById('tf2-cash-badge-footer');

// Elementos de Paginación
const pageStartIdx = document.getElementById('page-start-idx');
const pageEndIdx = document.getElementById('page-end-idx');
const pageTotalCount = document.getElementById('page-total-count');
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const paginationPages = document.getElementById('pagination-pages');

// Elementos de Estadísticas Globales del Footer
const statAvailableGames = document.getElementById('stat-available-games');
const statPendingGames = document.getElementById('stat-pending-games');
const statPendingOfferKeys = document.getElementById('stat-pending-offer-keys');
const statPendingOfferCash = document.getElementById('stat-pending-offer-cash');
const statSoldCount = document.getElementById('stat-sold-count');
const statSoldTotalCash = document.getElementById('stat-sold-total-cash');

// Botones de Cabecera y Consulta de Precios
const btnSyncPrices = document.getElementById('btn-sync-prices');
const btnSyncIcon = document.getElementById('btn-sync-icon');
const btnSyncText = document.getElementById('btn-sync-text');
const btnImportCsv = document.getElementById('btn-import-csv');
const inputCsvImport = document.getElementById('input-csv-import');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnSteamtradesTable = document.getElementById('btn-steamtrades-table');

// Modal Añadir Juego
const btnOpenAddModal = document.getElementById('btn-open-add-modal');
const modalAddGame = document.getElementById('modal-add-game');
const btnCloseAddModal = document.getElementById('btn-close-add-modal');
const btnCancelAdd = document.getElementById('btn-cancel-add');
const btnSubmitAdd = document.getElementById('btn-submit-add');
const inputSteamUrl = document.getElementById('input-steam-url');
const inputTf2Keys = document.getElementById('input-tf2-keys');
const inputBuyerName = document.getElementById('input-buyer-name');

// Modal de Edición de Juego (Estilo Tarjeta Visual)
const editModal = document.getElementById('edit-modal');
const modalTitle = document.getElementById('modal-game-title');
const modalGameImg = document.getElementById('modal-game-img');
const modalGameAppId = document.getElementById('modal-game-appid');
const editGameId = document.getElementById('edit-game-id');
const editStatus = document.getElementById('edit-status');
const editTf2Keys = document.getElementById('edit-tf2-keys');
const editBuyerName = document.getElementById('edit-buyer-name');
const editSoldCurrency = document.getElementById('edit-sold-currency');
const editSoldPrice = document.getElementById('edit-sold-price');
const editSoldCurrencyLabel = document.getElementById('edit-sold-currency-label');
const editSoldNote = document.getElementById('edit-sold-note');
const editIssueNote = document.getElementById('edit-issue-note');
const soldKeysContainer = document.getElementById('sold-keys-container');
const issueContainer = document.getElementById('issue-container');
const editForm = document.getElementById('edit-form');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const btnDeleteGame = document.getElementById('btn-delete-game');
const btnModalSyncPrice = document.getElementById('btn-modal-sync-price');
const modalSyncIcon = document.getElementById('modal-sync-icon');
const modalSyncText = document.getElementById('modal-sync-text');

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

// Modal Generador de Tabla SteamTrades (Markdown)
const modalSteamtradesExport = document.getElementById('modal-steamtrades-export');
const btnCloseStModal = document.getElementById('btn-close-st-modal');
const btnCancelStModal = document.getElementById('btn-cancel-st-modal');
const btnCopyStMarkdown = document.getElementById('btn-copy-st-markdown');
const btnDownloadStMarkdown = document.getElementById('btn-download-st-markdown');
const stMarkdownOutput = document.getElementById('st-markdown-output');
const stPreviewCount = document.getElementById('st-preview-count');
const stCopyStatus = document.getElementById('st-copy-status');
const stExportScope = document.getElementById('st-export-scope');
const stExportPriceFormat = document.getElementById('st-export-price-format');
const stExportSpacing = document.getElementById('st-export-spacing');

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
    try {
      const resSummary = await fetch('/api/summary');
      if (resSummary.ok) {
        const summary = await resSummary.json();
        if (summary && summary.tf2_cash_price) {
          tf2CashPrice = summary.tf2_cash_price;
          tf2SteamPrice = summary.tf2_steam_price;
          if (tf2LiveBadge) tf2LiveBadge.textContent = `${tf2SteamPrice.toFixed(2)} €`;
          if (tf2CashBadge) tf2CashBadge.textContent = `${tf2CashPrice.toFixed(2)} €`;
          if (tf2LiveBadgeFooter) tf2LiveBadgeFooter.textContent = `${tf2SteamPrice.toFixed(2)} €`;
          if (tf2CashBadgeFooter) tf2CashBadgeFooter.textContent = `${tf2CashPrice.toFixed(2)} €`;
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
      }
    } catch (errSum) {
      console.warn("No se pudo cargar /api/summary:", errSum);
    }

    const resGames = await fetch('/api/games');
    if (!resGames.ok) {
      throw new Error(`Error en API /api/games: HTTP ${resGames.status}`);
    }
    const data = await resGames.json();
    allGamesList = Array.isArray(data) ? data : [];

    // Cargar progreso persistido de la base de datos solo para juegos en negociación
    keyIncreases = {};
    allGamesList.forEach(g => {
      if (g.status === 'pending' && g.counter_increase_tf2 && Number(g.counter_increase_tf2) > 0) {
        keyIncreases[g.id] = Number(g.counter_increase_tf2);
      }
    });

    // Complementar con localStorage si existe (solo para juegos activos en negociación)
    try {
      const savedInc = localStorage.getItem('steamtrades_key_increases');
      if (savedInc) {
        const parsed = JSON.parse(savedInc);
        Object.keys(parsed).forEach(k => {
          const matchingGame = allGamesList.find(g => String(g.id) === String(k) || String(g.app_id) === String(k));
          if (matchingGame && matchingGame.status === 'pending') {
            if (keyIncreases[k] === undefined) keyIncreases[k] = parsed[k];
          }
        });
      }
    } catch (e) {}

    updateFilterCounts();
    setTableFilter(currentTableFilter);
    calculateTotals();

    // Comprobar si hay una sincronización de listados en progreso en el servidor
    try {
      const resSync = await fetch('/api/games/sync-listed/status');
      if (resSync.ok) {
        const syncState = await resSync.json();
        if (syncState && syncState.is_syncing) {
          startSyncListedPolling();
        }
      }
    } catch (e) {}
  } catch (err) {
    console.error("Error al cargar datos de la tabla:", err);
    showToast(`Error al cargar catálogo: ${err.message}`, "error");
  }
}

function updateFilterCounts() {
  const countListed = allGamesList.filter(g => g.status === 'listed').length;
  const countPending = allGamesList.filter(g => g.status === 'pending').length;
  const countIssue = allGamesList.filter(g => g.status === 'issue').length;
  const countSold = allGamesList.filter(g => g.status === 'sold' || g.is_sold).length;
  const countArchived = allGamesList.filter(g => g.status === 'archived' && !g.is_sold && g.status !== 'sold').length;
  const countDelisted = allGamesList.filter(g => g.is_delisted_steam && g.status !== 'sold' && g.status !== 'archived').length;

  const elListed = document.getElementById('count-table-listed');
  if (elListed) elListed.textContent = countListed;
  const elPending = document.getElementById('count-table-pending');
  if (elPending) elPending.textContent = countPending;
  const elIssue = document.getElementById('count-table-issue');
  if (elIssue) elIssue.textContent = countIssue;
  const elSold = document.getElementById('count-table-sold');
  if (elSold) elSold.textContent = countSold;
  const elArchived = document.getElementById('count-table-archived');
  if (elArchived) elArchived.textContent = countArchived;
  const elDelisted = document.getElementById('count-table-delisted');
  if (elDelisted) elDelisted.textContent = countDelisted;
}

function applyCurrentTableFilter() {
  if (currentTableFilter === 'listed') {
    games = allGamesList.filter(g => g.status === 'listed');
  } else if (currentTableFilter === 'pending') {
    games = allGamesList.filter(g => g.status === 'pending');
  } else if (currentTableFilter === 'issue') {
    games = allGamesList.filter(g => g.status === 'issue');
  } else if (currentTableFilter === 'sold') {
    games = allGamesList.filter(g => g.status === 'sold' || g.is_sold);
  } else if (currentTableFilter === 'archived') {
    games = allGamesList.filter(g => g.status === 'archived' && !g.is_sold && g.status !== 'sold');
  } else if (currentTableFilter === 'delisted') {
    games = allGamesList.filter(g => g.is_delisted_steam && g.status !== 'sold' && g.status !== 'archived');
  } else {
    games = allGamesList.filter(g => g.status === 'listed');
  }
}

function setTableFilter(filterName) {
  currentTableFilter = filterName;
  currentPage = 1;

  const activeStyles = {
    'listed': ['active', 'bg-blue-600', 'text-white', 'border-blue-500', 'shadow-md', 'shadow-blue-900/30', 'font-bold', 'opacity-100'],
    'pending': ['active', 'bg-purple-600', 'text-white', 'border-purple-500', 'shadow-md', 'shadow-purple-900/30', 'font-bold', 'opacity-100'],
    'issue': ['active', 'bg-rose-600', 'text-white', 'border-rose-500', 'shadow-md', 'shadow-rose-900/30', 'font-bold', 'opacity-100'],
    'sold': ['active', 'bg-emerald-600', 'text-white', 'border-emerald-500', 'shadow-md', 'shadow-emerald-900/30', 'font-bold', 'opacity-100'],
    'archived': ['active', 'bg-slate-700', 'text-white', 'border-slate-600', 'shadow-md', 'font-bold', 'opacity-100'],
    'delisted': ['active', 'bg-amber-600', 'text-white', 'border-amber-500', 'shadow-md', 'shadow-amber-900/30', 'font-bold', 'opacity-100']
  };

  const allStyleClasses = [
    'active', 'bg-blue-600', 'border-blue-500', 'shadow-blue-900/30',
    'bg-purple-600', 'border-purple-500', 'shadow-purple-900/30',
    'bg-rose-600', 'border-rose-500', 'shadow-rose-900/30',
    'bg-emerald-600', 'border-emerald-500', 'shadow-emerald-900/30',
    'bg-slate-700', 'border-slate-600',
    'bg-amber-600', 'border-amber-500', 'shadow-amber-900/30',
    'text-white', 'shadow-md', 'font-bold', 'opacity-100',
    'opacity-75', 'bg-slate-950/60', 'hover:bg-slate-800/60', 'text-slate-400', 'border-slate-800/80', 'font-semibold'
  ];

  const filterNames = ['listed', 'pending', 'issue', 'sold', 'archived', 'delisted'];

  filterNames.forEach(f => {
    const btn = document.getElementById(`filter-table-${f}`);
    if (btn) {
      btn.classList.remove(...allStyleClasses);
      if (f === filterName) {
        const classesToAdd = activeStyles[f] || activeStyles['listed'];
        btn.classList.add(...classesToAdd);
      } else {
        btn.classList.add('opacity-75', 'bg-slate-950/60', 'hover:bg-slate-800/60', 'text-slate-400', 'border', 'border-slate-800/80', 'font-semibold');
      }
    }
  });

  applyCurrentTableFilter();
  renderTable();
  calculateTotals();
}

function saveStoredData() {
  try {
    localStorage.setItem('steamtrades_key_increases', JSON.stringify(keyIncreases));
  } catch (e) {}

  // Sincronizar en segundo plano con el backend
  fetch('/api/games/bulk-state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ increases: keyIncreases, reviewed: {} })
  }).catch(() => {});
}

function setupEvents() {
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentPage = 1;
      renderTable();
    });
  }

  // Filtros de estado de la tabla (6 categorías)
  ['listed', 'pending', 'issue', 'sold', 'archived', 'delisted'].forEach(f => {
    const btn = document.getElementById(`filter-table-${f}`);
    if (btn) {
      btn.addEventListener('click', () => setTableFilter(f));
    }
  });

  let syncListedPollingInterval = null;

  function startSyncListedPolling() {
    if (syncListedPollingInterval) return;

    if (btnSyncPrices) btnSyncPrices.disabled = true;
    if (btnSyncIcon) btnSyncIcon.classList.add('fa-spin');

    syncListedPollingInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/games/sync-listed/status');
        if (!res.ok) return;
        const status = await res.json();

        if (status.is_syncing) {
          if (btnSyncText) {
            btnSyncText.textContent = `Consultando (${status.current}/${status.total})...`;
          }
        } else {
          clearInterval(syncListedPollingInterval);
          syncListedPollingInterval = null;

          if (btnSyncPrices) btnSyncPrices.disabled = false;
          if (btnSyncIcon) btnSyncIcon.classList.remove('fa-spin');
          if (btnSyncText) btnSyncText.textContent = "Consultar Precios";

          if (status.updated > 0 || status.current > 0) {
            showToast(`Precios actualizados: ${status.updated} juegos listados sincronizados.`, "success");
            await initData();
          } else if (status.message) {
            showToast(status.message, "info");
          }
        }
      } catch (e) {
        console.warn("Error en polling de sync-listed:", e);
      }
    }, 1500);
  }

  // Botón General para Consultar Precios de Todos los Listados o Lista Filtrada
  if (btnSyncPrices) {
    btnSyncPrices.addEventListener('click', async () => {
      const term = (searchInput ? searchInput.value : '').toLowerCase().trim();

      // Si estamos en la pestaña Listados y no hay filtro de búsqueda restrictivo:
      // Sincronizamos TODOS los juegos listados mediante el nuevo endpoint
      if (currentTableFilter === 'listed' && !term) {
        btnSyncPrices.disabled = true;
        if (btnSyncIcon) btnSyncIcon.classList.add('fa-spin');
        if (btnSyncText) btnSyncText.textContent = "Iniciando consulta...";

        try {
          const res = await fetch('/api/games/sync-listed', { method: 'POST' });
          const data = await res.json();
          if (res.ok) {
            if (data.status === 'started' || data.status === 'already_running') {
              showToast(data.message || "Consultando cotizaciones de todos los listados...", "info");
              startSyncListedPolling();
            } else if (data.status === 'completed') {
              showToast(data.message || "Precios actualizados.", "success");
              await initData();
            } else {
              showToast(data.message || "No hay juegos listados para sincronizar.", "info");
              btnSyncPrices.disabled = false;
              if (btnSyncIcon) btnSyncIcon.classList.remove('fa-spin');
              if (btnSyncText) btnSyncText.textContent = "Consultar Precios";
            }
          } else {
            showToast("Error al iniciar consulta de precios.", "error");
            btnSyncPrices.disabled = false;
            if (btnSyncIcon) btnSyncIcon.classList.remove('fa-spin');
            if (btnSyncText) btnSyncText.textContent = "Consultar Precios";
          }
        } catch (err) {
          console.error("Error al iniciar sincronización:", err);
          showToast("Error de conexión al consultar precios.", "error");
          btnSyncPrices.disabled = false;
          if (btnSyncIcon) btnSyncIcon.classList.remove('fa-spin');
          if (btnSyncText) btnSyncText.textContent = "Consultar Precios";
        }
        return;
      }

      // Si el usuario está buscando por texto o está en otro filtro:
      // Consultamos TODOS los juegos coincidentes de la lista completa (no solo la primera página)
      let list = [...games];
      if (term) list = list.filter(g => g.name.toLowerCase().includes(term));
      const idsToSync = list.map(g => g.id);

      if (idsToSync.length === 0) {
        showToast("No hay juegos para consultar precios.", "info");
        return;
      }

      btnSyncPrices.disabled = true;
      if (btnSyncIcon) btnSyncIcon.classList.add('fa-spin');
      if (btnSyncText) btnSyncText.textContent = `Consultando (${idsToSync.length})...`;

      try {
        const res = await fetch('/api/games/sync-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsToSync })
        });
        const data = await res.json();
        if (res.ok && data.games) {
          data.games.forEach(updated => {
            const idx = allGamesList.findIndex(x => x.id === updated.id);
            if (idx !== -1) allGamesList[idx] = updated;
          });
          applyCurrentTableFilter();
          renderTable();
          calculateTotals();
          showToast(`Precios actualizados para ${data.updated_count} juegos.`, "success");
        } else {
          showToast("Error al consultar precios.", "error");
        }
      } catch (err) {
        console.error("Error sincronizando precios:", err);
        showToast("Error de conexión al consultar precios.", "error");
      } finally {
        btnSyncPrices.disabled = false;
        if (btnSyncIcon) btnSyncIcon.classList.remove('fa-spin');
        if (btnSyncText) btnSyncText.textContent = "Consultar Precios";
      }
    });
  }

  // Botón en Modal de Detalle para Consultar Precios de un Juego Individual
  if (btnModalSyncPrice) {
    btnModalSyncPrice.addEventListener('click', async () => {
      if (!selectedGameId) return;

      btnModalSyncPrice.disabled = true;
      if (modalSyncIcon) modalSyncIcon.classList.add('fa-spin');
      if (modalSyncText) modalSyncText.textContent = "Consultando...";

      try {
        const res = await fetch(`/api/games/${selectedGameId}/sync`, { method: 'POST' });
        const data = await res.json();
        if (res.ok && data.game) {
          const updated = data.game;
          const idx = allGamesList.findIndex(x => String(x.id) === String(selectedGameId));
          if (idx !== -1) allGamesList[idx] = updated;

          try {
            const resSum = await fetch('/api/summary');
            if (resSum.ok) {
              const summary = await resSum.json();
              if (summary && summary.tf2_cash_price) {
                tf2CashPrice = summary.tf2_cash_price;
                tf2SteamPrice = summary.tf2_steam_price;
                if (tf2LiveBadge) tf2LiveBadge.textContent = `${tf2SteamPrice.toFixed(2)} €`;
                if (tf2CashBadge) tf2CashBadge.textContent = `${tf2CashPrice.toFixed(2)} €`;
                if (tf2LiveBadgeFooter) tf2LiveBadgeFooter.textContent = `${tf2SteamPrice.toFixed(2)} €`;
                if (tf2CashBadgeFooter) tf2CashBadgeFooter.textContent = `${tf2CashPrice.toFixed(2)} €`;
                const tf2LastUpdateEl = document.getElementById('tf2-last-update');
                if (tf2LastUpdateEl && summary.last_tf2_update) {
                  tf2LastUpdateEl.textContent = `(${summary.last_tf2_update})`;
                }
              }
            }
          } catch (e) {}

          applyCurrentTableFilter();
          renderTable();
          calculateTotals();
          openEditModal(selectedGameId);
          showToast(`Precios de "${updated.name}" actualizados correctamente.`, "success");
        } else {
          showToast("Error al consultar precios del juego.", "error");
        }
      } catch (err) {
        console.error("Error sincronizando juego:", err);
        showToast("Error de conexión al consultar precios.", "error");
      } finally {
        btnModalSyncPrice.disabled = false;
        if (modalSyncIcon) modalSyncIcon.classList.remove('fa-spin');
        if (modalSyncText) modalSyncText.textContent = "Actualizar Precios";
      }
    });
  }

  // Botones de Paginación
  if (btnPrevPage) {
    btnPrevPage.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  }

  if (btnNextPage) {
    btnNextPage.addEventListener('click', () => {
      const term = (searchInput ? searchInput.value : '').toLowerCase().trim();
      let list = [...games];
      if (term) list = list.filter(g => g.name.toLowerCase().includes(term));
      const totalPages = Math.ceil(list.length / PAGE_SIZE) || 1;
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
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

  // Listeners Generador Tabla SteamTrades
  if (btnSteamtradesTable) {
    btnSteamtradesTable.addEventListener('click', openSteamTradesModal);
  }
  if (btnCloseStModal) btnCloseStModal.addEventListener('click', closeSteamTradesModal);
  if (btnCancelStModal) btnCancelStModal.addEventListener('click', closeSteamTradesModal);
  if (btnCopyStMarkdown) btnCopyStMarkdown.addEventListener('click', copySteamTradesMarkdown);
  if (btnDownloadStMarkdown) btnDownloadStMarkdown.addEventListener('click', downloadSteamTradesMarkdown);
  if (stExportScope) stExportScope.addEventListener('change', refreshSteamTradesMarkdown);
  if (stExportPriceFormat) stExportPriceFormat.addEventListener('change', refreshSteamTradesMarkdown);
  if (stExportSpacing) stExportSpacing.addEventListener('change', refreshSteamTradesMarkdown);

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
    if (inputTf2Keys) inputTf2Keys.value = '';
    if (inputBuyerName) inputBuyerName.value = '';
    selectedCandidateAppId = null;
    if (searchSuggestionsDropdown) {
      searchSuggestionsDropdown.innerHTML = '';
      searchSuggestionsDropdown.classList.add('hidden');
    }
    if (addGamePreviewCard) addGamePreviewCard.classList.add('hidden');
    if (searchSpinner) searchSpinner.classList.add('hidden');
  }

  const closeAddModal = () => {
    if (modalAddGame) {
      modalAddGame.classList.add('hidden');
      modalAddGame.classList.remove('flex');
      resetAddModalForm();
    }
  };

  if (btnCloseAddModal) btnCloseAddModal.addEventListener('click', closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

  // Modal Añadir Juego
  if (btnOpenAddModal) {
    btnOpenAddModal.addEventListener('click', () => {
      resetAddModalForm();
      if (modalAddGame) {
        modalAddGame.classList.remove('hidden');
        modalAddGame.classList.add('flex');
        if (inputSteamUrl) inputSteamUrl.focus();
      }
    });
  }

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
            renderTableSearchSuggestions(items);
          }
        } catch (err) {
          console.error("Error searching games", err);
        } finally {
          if (searchSpinner) searchSpinner.classList.add('hidden');
        }
      }, 300);
    });
  }

  function renderTableSearchSuggestions(items) {
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

  if (btnSubmitAdd) {
    btnSubmitAdd.addEventListener('click', async () => {
      const rawVal = inputSteamUrl ? inputSteamUrl.value.trim() : '';
      const tf2Keys = inputTf2Keys && inputTf2Keys.value ? parseFloat(inputTf2Keys.value) : 0.0;
      const buyer = inputBuyerName && inputBuyerName.value.trim() ? inputBuyerName.value.trim() : null;

      if (!rawVal) {
        showToast("Introduce un nombre o URL válida de Steam.", "warning");
        return;
      }

      const payloadQuery = selectedCandidateAppId || rawVal;
      btnSubmitAdd.disabled = true;
      btnSubmitAdd.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Añadiendo...`;

      try {
        const res = await fetch('/api/games/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: payloadQuery, steam_url: payloadQuery, tf2_keys_offered: tf2Keys, buyer_name: buyer })
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

  // Modal de Edición de Juego (Estilo Tarjeta)
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeEditModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeEditModal);
  if (editForm) {
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveModalData();
    });
  }

  if (editStatus) {
    editStatus.addEventListener('change', () => {
      const st = editStatus.value;
      updateModalStatusBadge(st);
      syncStatusPanels(st);
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

  if (btnDeleteGame) {
    btnDeleteGame.addEventListener('click', async () => {
      if (!selectedGameId) return;
      const game = allGamesList.find(g => String(g.id) === String(selectedGameId)) || games.find(g => String(g.id) === String(selectedGameId));
      const gameTitle = game ? game.name : `Juego #${selectedGameId}`;
      if (!confirm(`¿Estás seguro de que deseas eliminar "${gameTitle}" del catálogo?`)) {
        return;
      }

      btnDeleteGame.disabled = true;
      try {
        const res = await fetch(`/api/games/${selectedGameId}`, { method: 'DELETE' });
        if (res.ok) {
          closeEditModal();
          showToast(`Juego "${gameTitle}" eliminado con éxito.`, "info");
          await initData();
        } else {
          showToast("Error al eliminar el juego.", "error");
        }
      } catch (err) {
        console.error("Error deleting game", err);
        showToast("Error de conexión al eliminar el juego.", "error");
      } finally {
        btnDeleteGame.disabled = false;
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

function getAskingPriceData(g) {
  // 1. Si el usuario fijó un precio explícito (counter_price o offer_price fijado en listed)
  const userPrice = (g.counter_price && Number(g.counter_price) > 0) 
    ? Number(g.counter_price) 
    : ((g.offer_price && Number(g.offer_price) > 0 && g.status === 'listed') ? Number(g.offer_price) : null);

  if (userPrice !== null) {
    const curr = g.counter_currency || g.offer_currency || 'TF2';
    const isEur = curr === 'EUR';
    const tf2Val = isEur ? (userPrice / tf2CashPrice) : userPrice;
    const eurVal = isEur ? userPrice : (userPrice * tf2CashPrice);
    return {
      type: 'fixed',
      value: userPrice,
      currency: curr,
      displayTf2: tf2Val,
      displayEur: eurVal,
      text: isEur ? `${userPrice.toFixed(2)} €` : `${userPrice.toFixed(2)} TF2`
    };
  }

  // 2. Si no, calcular precio de salida sugerido según suelo de mercado / Kinguin / mínimos con redondeo al alza de 0.5 TF2
  const minCur = getMinCurrentPrice(g);
  const floorEur = (typeof g.floor_price_eur === 'number' && g.floor_price_eur > 0.05) 
    ? g.floor_price_eur 
    : ((typeof g.kinguin_price_eur === 'number' && g.kinguin_price_eur > 0.05) 
      ? g.kinguin_price_eur 
      : (minCur < 9000 ? minCur : (typeof g.steam_store_price === 'number' ? g.steam_store_price : null)));

  if (floorEur !== null && floorEur > 0.05) {
    const rawTf2 = (floorEur / tf2CashPrice);
    const sugTf2 = Math.max(0.5, Math.ceil(rawTf2 * 2) / 2);
    const sugEur = sugTf2 * tf2CashPrice;
    return {
      type: 'suggested',
      value: sugTf2,
      currency: 'TF2',
      displayTf2: sugTf2,
      displayEur: sugEur,
      text: `${sugTf2.toFixed(2)} TF2`
    };
  }

  return { type: 'none', value: 0, displayTf2: 0, displayEur: 0, text: '-' };
}

function getAskingPriceValue(g) {
  const data = getAskingPriceData(g);
  return data.displayTf2 || 0;
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
  const fields = ['id', 'name', 'buyer', 'players', 'min_current', 'kinguin', 'floor', 'asking_price', 'orig_tf2', 'increase', 'counter_tf2', 'balance', 'improvement'];
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

function formatGameName(name, maxLen = 40) {
  if (!name) return '';
  if (name.length > maxLen) {
    return name.slice(0, maxLen).trim() + '...';
  }
  return name;
}

function renderTableHeader() {
  if (!tableHead) return;

  if (currentTableFilter === 'listed') {
    tableHead.innerHTML = `
      <tr class="text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800 font-bold select-none bg-slate-950/60">
        <th onclick="handleSortTable('id')" class="sortable-th py-2 px-2 pl-3 w-14 text-center cursor-pointer" title="Ordenar por ID">
          <span class="inline-flex items-center justify-center gap-1">ID <i id="sort-icon-id" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('name')" class="sortable-th py-2 px-3 min-w-[260px] cursor-pointer" title="Ordenar por Nombre">
          <span class="inline-flex items-center gap-1">Juego <i id="sort-icon-name" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('min_current')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer" title="Ordenar por Mínimo Actual">
          <span class="inline-flex items-center justify-center gap-1">Mínimo Actual <i id="sort-icon-min_current" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('kinguin')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer" title="Precio Kinguin ROW">
          <span class="inline-flex items-center justify-center gap-1">Kinguin (ROW) <i id="sort-icon-kinguin" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('floor')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer" title="Ordenar por Suelo Mínimo">
          <span class="inline-flex items-center justify-center gap-1">Suelo Mínimo <i id="sort-icon-floor" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('asking_price')" class="sortable-th py-2 px-3 text-center min-w-[130px] cursor-pointer" title="Ordenar por Precio de Salida">
          <span class="inline-flex items-center justify-center gap-1 text-amber-300 font-bold">Precio Salida <i id="sort-icon-asking_price" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[90px]">Acciones</th>
      </tr>
    `;
  } else if (currentTableFilter === 'pending') {
    tableHead.innerHTML = `
      <tr class="text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800 font-bold select-none bg-slate-950/60">
        <th onclick="handleSortTable('id')" class="sortable-th py-2 px-2 pl-3 w-14 text-center cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">ID <i id="sort-icon-id" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('name')" class="sortable-th py-2 px-3 min-w-[200px] cursor-pointer">
          <span class="inline-flex items-center gap-1">Juego <i id="sort-icon-name" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('buyer')" class="sortable-th py-2 px-3 text-center min-w-[110px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Comprador <i id="sort-icon-buyer" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('players')" class="sortable-th py-2 px-3 text-center min-w-[100px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Jugadores (24h) <i id="sort-icon-players" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('min_current')" class="sortable-th py-2 px-3 text-center min-w-[110px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Mínimo Actual <i id="sort-icon-min_current" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('floor')" class="sortable-th py-2 px-3 text-center min-w-[110px] border-r border-slate-800 cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Suelo Mínimo <i id="sort-icon-floor" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('orig_tf2')" class="sortable-th py-2 px-3 text-center min-w-[105px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Oferta Recibida <i id="sort-icon-orig_tf2" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('increase')" class="sortable-th py-2 px-3 text-center min-w-[125px] border-r border-slate-800 cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Aumentar (TF2) <i id="sort-icon-increase" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('counter_tf2')" class="sortable-th py-2 px-3 text-center min-w-[125px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Contraoferta TF2 <i id="sort-icon-counter_tf2" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('balance')" class="sortable-th py-2 px-3 text-center min-w-[115px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Balance vs Suelo <i id="sort-icon-balance" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('improvement')" class="sortable-th py-2 px-3 text-center min-w-[110px] border-r border-slate-800 cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Mejora (% Suelo) <i id="sort-icon-improvement" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[80px]">Acción</th>
      </tr>
    `;
  } else if (currentTableFilter === 'issue') {
    tableHead.innerHTML = `
      <tr class="text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800 font-bold select-none bg-slate-950/60">
        <th onclick="handleSortTable('id')" class="sortable-th py-2 px-2 pl-3 w-14 text-center cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">ID <i id="sort-icon-id" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('name')" class="sortable-th py-2 px-3 min-w-[240px] cursor-pointer">
          <span class="inline-flex items-center gap-1">Juego <i id="sort-icon-name" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 min-w-[220px]">Motivo de Incidencia / Nota</th>
        <th onclick="handleSortTable('min_current')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Mínimo Actual <i id="sort-icon-min_current" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('floor')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Suelo Mínimo <i id="sort-icon-floor" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[90px]">Acciones</th>
      </tr>
    `;
  } else if (currentTableFilter === 'sold') {
    tableHead.innerHTML = `
      <tr class="text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800 font-bold select-none bg-slate-950/60">
        <th onclick="handleSortTable('id')" class="sortable-th py-2 px-2 pl-3 w-14 text-center cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">ID <i id="sort-icon-id" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('name')" class="sortable-th py-2 px-3 min-w-[240px] cursor-pointer">
          <span class="inline-flex items-center gap-1">Juego <i id="sort-icon-name" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('buyer')" class="sortable-th py-2 px-3 text-center min-w-[110px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Comprador <i id="sort-icon-buyer" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[110px]">Precio Venta</th>
        <th class="py-2 px-3 min-w-[180px]">Nota / Comentario</th>
        <th onclick="handleSortTable('floor')" class="sortable-th py-2 px-3 text-center min-w-[110px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Suelo Mínimo <i id="sort-icon-floor" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[80px]">Acciones</th>
      </tr>
    `;
  } else if (currentTableFilter === 'archived') {
    tableHead.innerHTML = `
      <tr class="text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800 font-bold select-none bg-slate-950/60">
        <th onclick="handleSortTable('id')" class="sortable-th py-2 px-2 pl-3 w-14 text-center cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">ID <i id="sort-icon-id" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('name')" class="sortable-th py-2 px-3 min-w-[240px] cursor-pointer">
          <span class="inline-flex items-center gap-1">Juego <i id="sort-icon-name" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('buyer')" class="sortable-th py-2 px-3 text-center min-w-[110px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Comprador <i id="sort-icon-buyer" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 min-w-[180px]">Nota / Estado</th>
        <th onclick="handleSortTable('floor')" class="sortable-th py-2 px-3 text-center min-w-[110px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Suelo Mínimo <i id="sort-icon-floor" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[80px]">Acciones</th>
      </tr>
    `;
  } else if (currentTableFilter === 'delisted') {
    tableHead.innerHTML = `
      <tr class="text-slate-300 uppercase tracking-wider text-xs border-b border-slate-800 font-bold select-none bg-slate-950/60">
        <th onclick="handleSortTable('id')" class="sortable-th py-2 px-2 pl-3 w-14 text-center cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">ID <i id="sort-icon-id" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('name')" class="sortable-th py-2 px-3 min-w-[260px] cursor-pointer">
          <span class="inline-flex items-center gap-1">Juego <i id="sort-icon-name" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('min_current')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Mínimo Actual <i id="sort-icon-min_current" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('kinguin')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Kinguin (ROW) <i id="sort-icon-kinguin" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th onclick="handleSortTable('floor')" class="sortable-th py-2 px-3 text-center min-w-[120px] cursor-pointer">
          <span class="inline-flex items-center justify-center gap-1">Suelo Mínimo <i id="sort-icon-floor" class="fa-solid fa-sort text-[10px] opacity-40"></i></span>
        </th>
        <th class="py-2 px-3 text-center min-w-[90px]">Acciones</th>
      </tr>
    `;
  }

  updateSortIcons();
}

function renderTable() {
  if (!tableBody) return;
  renderTableHeader();

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
        return mult * (a.buyer_name || '').localeCompare(b.buyer_name || '');
      case 'players':
        return mult * ((a.steam_players_24h || 0) - (b.steam_players_24h || 0));
      case 'min_current':
        return mult * (getMinCurrentPrice(a) - getMinCurrentPrice(b));
      case 'kinguin':
        return mult * ((a.kinguin_price_eur || 0) - (b.kinguin_price_eur || 0));
      case 'floor':
        return mult * ((a.floor_price_eur || 0) - (b.floor_price_eur || 0));
      case 'asking_price':
        return mult * (getAskingPriceValue(a) - getAskingPriceValue(b));
      case 'orig_tf2':
        return mult * (Number(a.tf2_keys_offered || 0) - Number(b.tf2_keys_offered || 0));
      case 'increase':
        return mult * (getIncrease(a) - getIncrease(b));
      case 'counter_tf2':
        return mult * (getEffectiveOffer(a) - getEffectiveOffer(b));
      case 'balance':
        return mult * (getBalancePct(a) - getBalancePct(b));
      case 'improvement':
        return mult * (getImprovementPct(a) - getImprovementPct(b));
      case 'id':
      case 'index':
      default:
        return mult * (Number(a.id) - Number(b.id));
    }
  });

  // Paginación a 15 registros por página
  const totalItems = list.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageItems = list.slice(startIdx, startIdx + PAGE_SIZE);

  tableBody.innerHTML = '';

  if (pageItems.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `
      <td colspan="12" class="py-8 text-center text-slate-400 font-medium">
        <i class="fa-solid fa-box-open text-2xl mb-2 text-slate-500 block"></i>
        No se encontraron juegos en esta sección.
      </td>
    `;
    tableBody.appendChild(emptyRow);
    renderPagination(0);
    return;
  }

  let currentPageGameIds = pageItems.map(g => g.id);

  pageItems.forEach((game) => {
    const row = document.createElement('tr');
    row.id = `row-${game.id}`;
    row.className = "hover:bg-slate-800/60 transition border-b border-slate-800/80";

    const origTf2 = Number(game.tf2_keys_offered || 0);
    const increaseTf2 = getIncrease(game);
    const effectiveTf2 = getEffectiveOffer(game);
    const increaseCash = increaseTf2 * tf2CashPrice;
    const effectiveCash = effectiveTf2 * tf2CashPrice;
    const isSold = !!game.is_sold || game.status === 'sold';

    // 1. Jugadores Activos en Steam (24h)
    let playersHtml = `<span class="text-slate-500 font-mono text-xs">--</span>`;
    if (typeof game.steam_players_24h === 'number') {
      playersHtml = `
        <span class="text-slate-200 font-mono text-xs font-bold flex items-center justify-center gap-1">
          <i class="fa-solid fa-users text-slate-400 text-[10px]"></i>
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
    let minCurrentHtml = '<span class="text-slate-500 font-mono text-xs">-</span>';
    if (minCurrentPriceEur !== null) {
      const minCurrentTf2 = (minCurrentPriceEur / tf2CashPrice);
      minCurrentHtml = `
        <span class="font-bold text-slate-100 text-xs block font-mono leading-tight">${minCurrentTf2.toFixed(2)} TF2</span>
        <span class="text-[10px] text-slate-400 block font-mono leading-tight">(~${minCurrentPriceEur.toFixed(2)} €)</span>
      `;
    }

    // 3. Kinguin ROW (Solo muestra precio si fue revisado, sino un simple guion)
    let kinguinHtml = '<span class="text-slate-500 font-mono text-xs">-</span>';
    if (typeof game.kinguin_price_eur === 'number' && game.kinguin_price_eur > 0) {
      const kinguinTf2 = (game.kinguin_price_eur / tf2CashPrice);
      const kUrl = game.kinguin_url || `https://www.kinguin.net/listing?active=1&hide_out_of_stock=1&phrase=${encodeURIComponent(game.name)}&platform=Steam&region=Global`;
      kinguinHtml = `
        <a href="${kUrl}" target="_blank" class="group inline-block" title="Ver en Kinguin (Clave Global/ROW)">
          <span class="font-bold text-slate-100 group-hover:text-blue-300 text-xs block transition font-mono leading-tight">${kinguinTf2.toFixed(2)} TF2</span>
          <span class="text-[10px] text-slate-400 block group-hover:text-slate-300 font-mono leading-tight">(~${game.kinguin_price_eur.toFixed(2)} €)</span>
        </a>
      `;
    }

    // 4. Suelo Mínimo
    const floorPriceEur = (typeof game.floor_price_eur === 'number') ? game.floor_price_eur : null;
    const floorSource = game.floor_price_source || 'Suelo Mínimo';
    let floorHtml = '<span class="text-slate-500 font-mono text-xs">-</span>';
    if (floorPriceEur !== null) {
      const floorTf2 = (floorPriceEur / tf2CashPrice);
      floorHtml = `
        <span class="font-bold text-slate-100 text-xs block font-mono leading-tight">${floorTf2.toFixed(2)} TF2</span>
        <span class="text-[10px] text-slate-400 block font-mono leading-tight" title="Fuente: ${floorSource}">(~${floorPriceEur.toFixed(2)} €)</span>
      `;
    }

    // 5. Balance vs Suelo
    let balanceHtml = '<span class="text-slate-500 font-mono text-xs">-</span>';
    if (floorPriceEur !== null && origTf2 > 0) {
      const balanceEur = effectiveCash - floorPriceEur;
      const balancePct = (balanceEur / floorPriceEur) * 100;
      if (balanceEur >= 0) {
        balanceHtml = `
          <span class="bg-emerald-950/70 text-emerald-200 border border-emerald-700/60 px-2 py-0.5 rounded text-[11px] font-bold inline-block font-mono">
            +${balancePct.toFixed(1)}%
          </span>
          <span class="text-[10px] text-emerald-400 block mt-0.5 font-bold font-mono">+${balanceEur.toFixed(2)}€</span>
        `;
      } else {
        balanceHtml = `
          <span class="bg-rose-950/70 text-rose-200 border border-rose-700/60 px-2 py-0.5 rounded text-[11px] font-bold inline-block font-mono">
            ${balancePct.toFixed(1)}%
          </span>
          <span class="text-[10px] text-rose-300 block mt-0.5 font-bold font-mono">${balanceEur.toFixed(2)}€</span>
        `;
      }
    }

    // 6. Mejora
    const origCash = origTf2 * tf2CashPrice;
    const originalLossEur = floorPriceEur !== null ? (floorPriceEur - origCash) : 0;
    let improvementHtml = '';
    if (increaseTf2 > 0 && origTf2 > 0) {
      if (originalLossEur > 0) {
        const pctRecovered = (increaseCash / originalLossEur) * 100;
        improvementHtml = `
          <span class="text-slate-100 font-bold font-mono text-xs block leading-tight">+${pctRecovered.toFixed(1)}%</span>
          <span class="text-[10px] text-slate-400 block font-mono leading-tight">+${increaseCash.toFixed(2)}€ recup.</span>
        `;
      } else {
        const pctOverOrig = (increaseTf2 / origTf2) * 100;
        improvementHtml = `
          <span class="text-slate-100 font-bold font-mono text-xs block leading-tight">+${pctOverOrig.toFixed(1)}%</span>
          <span class="text-[10px] text-slate-400 block font-mono leading-tight">+${increaseCash.toFixed(2)}€ extra</span>
        `;
      }
    } else {
      improvementHtml = `<span class="text-slate-500 text-xs font-mono">-</span>`;
    }

    // Badges Compactos (Texto en text-[10px])
    const delistedIcon = game.is_delisted_steam 
      ? `<span class="text-[10px] leading-tight bg-amber-950/80 text-amber-300 border border-amber-700/60 font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1 shadow-sm" title="Juego retirado de Steam (Artículo de Coleccionista)"><i class="fa-solid fa-crown text-[9px] text-amber-400"></i> Coleccionista</span>` 
      : '';

    let soldIcon = '';
    if (isSold && currentTableFilter !== 'sold') {
      const isEur = game.sold_currency === 'EUR';
      const priceVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || effectiveTf2);
      const formattedPrice = isEur ? `${Number(priceVal).toFixed(2)} €` : `${priceVal} TF2`;
      soldIcon = `<span class="text-[10px] leading-tight bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1 shadow-sm" title="Vendido por ${formattedPrice}"><i class="fa-solid fa-check text-[9px] text-emerald-400"></i> Vendido (${formattedPrice})</span>`;
    }

    const headerImg = game.steam_header_image || FALLBACK_GAME_SVG;
    const safeName = escapeHtml(game.name);
    const displayName = escapeHtml(formatGameName(game.name, 40));

    const bundleBadge = game.bundle
      ? `<span class="text-[10px] leading-tight bg-slate-950 text-slate-400 border border-slate-800 font-normal px-1.5 py-0.5 rounded inline-flex items-center gap-1 max-w-[200px] truncate" title="Bundle: ${escapeHtml(game.bundle)}"><i class="fa-solid fa-box text-[9px] text-slate-500"></i> ${escapeHtml(game.bundle)}</span>`
      : '';

    const platBadge = (game.platform && game.platform !== 'STEAM')
      ? `<span class="text-[10px] leading-tight bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1 shadow-sm" title="Plataforma: ${escapeHtml(game.platform)}"><i class="fa-solid fa-gamepad text-[9px]"></i> ${escapeHtml(game.platform)}</span>`
      : '';

    const buyerBadge = game.buyer_name ? `
      <span class="text-xs bg-indigo-950/80 text-indigo-200 border border-indigo-700/60 font-bold px-2 py-0.5 rounded-lg inline-flex items-center gap-1" title="Comprador: ${escapeHtml(game.buyer_name)}">
        <i class="fa-solid fa-user text-indigo-400 text-[10px]"></i>
        <span>${escapeHtml(game.buyer_name)}</span>
      </span>
    ` : `<span class="text-slate-500 font-mono text-xs">-</span>`;

    const gameCellHtml = `
      <div class="flex items-center gap-2.5">
        <img src="${headerImg}" onclick="openEditModal('${game.id}')" class="w-11 h-6 object-cover rounded flex-shrink-0 shadow-sm border border-slate-800 cursor-pointer hover:ring-2 hover:ring-blue-400" onerror="this.onerror=null; this.src='${FALLBACK_GAME_SVG}'" title="Haz clic para ver detalles">
        <div class="min-w-0 flex-1">
          <span onclick="openEditModal('${game.id}')" class="text-xs sm:text-sm font-semibold hover:text-blue-300 transition cursor-pointer leading-snug block truncate" title="${safeName}">${displayName}</span>
          <div class="flex flex-wrap items-center gap-1 mt-0.5">
            ${platBadge}
            ${bundleBadge}
            ${delistedIcon}
            ${soldIcon}
          </div>
        </div>
      </div>
    `;

    const actionBtnHtml = `
      <button onclick="openEditModal('${game.id}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition flex items-center justify-center gap-1 mx-auto cursor-pointer shadow-sm" title="Ver detalles">
        <i class="fa-solid fa-eye text-blue-400 text-[10px]"></i> Detalle
      </button>
    `;

    // Renderizar columnas según la sección activa con padding compacto (py-1.5)
    if (currentTableFilter === 'listed') {
      const askingData = getAskingPriceData(game);
      let askingPriceHtml = '<span class="text-slate-500 font-mono text-xs">-</span>';
      if (askingData.type === 'fixed') {
        askingPriceHtml = `
          <div class="text-center font-mono cursor-pointer hover:opacity-80 transition" onclick="openEditModal('${game.id}')" title="Precio fijado por ti (${askingData.text}). Haz clic para editar.">
            <span class="font-bold text-emerald-400 text-xs block leading-tight">${askingData.text}</span>
            <span class="text-[9px] text-emerald-300/80 block leading-tight font-sans font-semibold">Fijado</span>
          </div>
        `;
      } else if (askingData.type === 'suggested') {
        askingPriceHtml = `
          <div class="text-center font-mono cursor-pointer hover:opacity-80 transition" onclick="openEditModal('${game.id}')" title="Precio de salida sugerido según suelo de mercado / Kinguin (~${askingData.displayEur.toFixed(2)} €). Haz clic para fijar.">
            <span class="font-bold text-amber-300 text-xs block leading-tight">${askingData.text}</span>
            <span class="text-[10px] text-slate-400 block leading-tight">(~${askingData.displayEur.toFixed(2)} €)</span>
          </div>
        `;
      }

      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${minCurrentHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${kinguinHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${askingPriceHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    } else if (currentTableFilter === 'pending') {
      const inputClass = `w-16 bg-slate-950 border ${increaseTf2 > 0 ? 'border-amber-500 text-amber-200 font-bold' : 'border-slate-700 text-slate-200'} rounded-lg px-1.5 py-1 text-center font-mono text-xs focus:outline-none focus:border-blue-500 transition`;
      const offerReceivedText = origTf2 > 0 ? `${origTf2} TF2` : '-';

      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${buyerBadge}</td>
        <td class="py-1.5 px-2.5 text-center">${playersHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${minCurrentHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs border-r border-slate-800" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center text-amber-300 font-mono text-xs font-bold">${offerReceivedText}</td>
        <td class="py-1.5 px-2.5 text-center border-r border-slate-800">
          <div class="inline-flex items-center gap-1 justify-center">
            <span class="text-slate-400 font-bold text-xs">+</span>
            <input type="number" step="0.25" min="0" 
                   id="inc-input-${game.id}"
                   value="${increaseTf2 > 0 ? increaseTf2 : ''}" 
                   placeholder="0.00" 
                   oninput="handleIncreaseInput('${game.id}', this.value)"
                   class="${inputClass}">
            <span class="text-[10px] text-slate-400 font-bold font-mono">TF2</span>
          </div>
        </td>
        <td id="cell-counter-${game.id}" class="py-1.5 px-2.5 text-center font-mono">
          <div class="flex flex-col items-center">
            <span class="font-bold text-emerald-400 text-xs leading-tight">${effectiveTf2 > 0 ? `${effectiveTf2} TF2` : '-'}</span>
            <span class="text-[10px] text-slate-400 leading-tight">${effectiveTf2 > 0 ? `~${effectiveCash.toFixed(2)} €` : ''}</span>
          </div>
        </td>
        <td id="cell-balance-${game.id}" class="py-1.5 px-2.5 text-center font-mono">${balanceHtml}</td>
        <td id="cell-improvement-${game.id}" class="py-1.5 px-2.5 text-center font-mono border-r border-slate-800">${improvementHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    } else if (currentTableFilter === 'issue') {
      const issueNoteText = escapeHtml(game.issue_note || 'Agotada / Fuera de stock');
      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-rose-300 font-medium text-xs">${issueNoteText}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${minCurrentHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    } else if (currentTableFilter === 'sold') {
      const isEur = game.sold_currency === 'EUR';
      const priceVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || (isSold ? effectiveTf2 : null));
      const formattedPrice = priceVal ? (isEur ? `${Number(priceVal).toFixed(2)} €` : `${priceVal} TF2`) : '-';

      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${buyerBadge}</td>
        <td class="py-1.5 px-2.5 text-center font-mono font-bold text-emerald-400 text-xs">${formattedPrice}</td>
        <td class="py-1.5 px-2.5 text-slate-400 text-xs">${escapeHtml(game.sold_note || '-')}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    } else if (currentTableFilter === 'archived') {
      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${buyerBadge}</td>
        <td class="py-1.5 px-2.5 text-slate-400 text-xs">${escapeHtml(game.sold_note || game.hb_status || 'Archivado')}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    } else if (currentTableFilter === 'delisted') {
      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${minCurrentHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${kinguinHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    } else {
      row.innerHTML = `
        <td class="py-1.5 px-2 pl-3 text-center text-slate-300 font-mono text-xs font-bold">${game.id}</td>
        <td class="py-1.5 px-2.5 font-medium text-slate-100">${gameCellHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${minCurrentHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs">${kinguinHtml}</td>
        <td class="py-1.5 px-2.5 text-center font-mono text-xs" title="Fuente: ${floorSource}">${floorHtml}</td>
        <td class="py-1.5 px-2.5 text-center">${actionBtnHtml}</td>
      `;
    }

    tableBody.appendChild(row);
  });

  renderPagination(totalItems);
}

function renderPagination(totalItems) {
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const startIdx = totalItems > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const endIdx = Math.min(currentPage * PAGE_SIZE, totalItems);

  if (pageStartIdx) pageStartIdx.textContent = startIdx;
  if (pageEndIdx) pageEndIdx.textContent = endIdx;
  if (pageTotalCount) pageTotalCount.textContent = totalItems;

  if (btnPrevPage) btnPrevPage.disabled = (currentPage <= 1);
  if (btnNextPage) btnNextPage.disabled = (currentPage >= totalPages);

  if (!paginationPages) return;
  paginationPages.innerHTML = '';

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    const btnFirst = document.createElement('button');
    btnFirst.className = "w-7 h-7 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer";
    btnFirst.textContent = "1";
    btnFirst.onclick = () => goToPage(1);
    paginationPages.appendChild(btnFirst);

    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.className = "text-slate-500 text-xs px-0.5 select-none";
      dots.textContent = "...";
      paginationPages.appendChild(dots);
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    const btn = document.createElement('button');
    const isActive = (p === currentPage);
    btn.className = isActive 
      ? "w-7 h-7 rounded-xl text-xs font-bold bg-blue-600 border border-blue-500 text-white shadow-sm cursor-pointer"
      : "w-7 h-7 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer";
    btn.textContent = p;
    btn.onclick = () => goToPage(p);
    paginationPages.appendChild(btn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = "text-slate-500 text-xs px-0.5 select-none";
      dots.textContent = "...";
      paginationPages.appendChild(dots);
    }

    const btnLast = document.createElement('button');
    btnLast.className = "w-7 h-7 rounded-xl text-xs font-semibold bg-slate-950 border border-slate-700 text-slate-300 hover:bg-slate-800 transition cursor-pointer";
    btnLast.textContent = totalPages;
    btnLast.onclick = () => goToPage(totalPages);
    paginationPages.appendChild(btnLast);
  }
}

function goToPage(page) {
  currentPage = page;
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
        <span class="font-black text-emerald-400 text-sm">
          ${effectiveTf2} TF2
        </span>
        <span class="text-xs text-slate-300 font-semibold">
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
        <span class="bg-emerald-950/70 text-emerald-200 border border-emerald-700/60 px-2.5 py-1 rounded-lg text-xs font-bold inline-block font-mono">
          +${balancePct.toFixed(1)}%
        </span>
        <span class="text-xs text-emerald-400 block mt-0.5 font-bold font-mono">+${balanceEur.toFixed(2)}€</span>
      `;
    } else {
      cellBalance.innerHTML = `
        <span class="bg-rose-950/70 text-rose-200 border border-rose-700/60 px-2.5 py-1 rounded-lg text-xs font-bold inline-block font-mono">
          ${balancePct.toFixed(1)}%
        </span>
        <span class="text-xs text-rose-300 block mt-0.5 font-bold font-mono">${balanceEur.toFixed(2)}€</span>
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
          <span class="text-slate-100 font-bold font-mono text-xs block">+${pctRecovered.toFixed(1)}%</span>
          <span class="text-xs text-slate-300 block font-mono">+${increaseCash.toFixed(2)}€ recup.</span>
        `;
      } else {
        const pctOverOrig = (increaseTf2 / origTf2) * 100;
        cellImp.innerHTML = `
          <span class="text-slate-100 font-bold font-mono text-xs block">+${pctOverOrig.toFixed(1)}%</span>
          <span class="text-xs text-slate-300 block font-mono">+${increaseCash.toFixed(2)}€ extra</span>
        `;
      }
    } else {
      cellImp.innerHTML = `<span class="text-slate-500 text-xs font-mono">0.0%</span>`;
    }
  }
}

function calculateTotals() {
  if (!allGamesList || allGamesList.length === 0) return;

  const countListed = allGamesList.filter(g => g.status === 'listed').length;
  const pendingGames = allGamesList.filter(g => g.status === 'pending');
  const countPending = pendingGames.length;

  let pendingKeys = 0;
  pendingGames.forEach(g => {
    pendingKeys += Number(g.tf2_keys_offered || g.offer_price || 0);
  });
  const pendingCash = pendingKeys * tf2CashPrice;

  const soldGames = allGamesList.filter(g => g.status === 'sold' || g.is_sold);
  const countSold = soldGames.length;
  let totalSoldEur = 0;
  soldGames.forEach(g => {
    const isEur = g.sold_currency === 'EUR';
    const priceVal = (g.sold_price !== null && g.sold_price !== undefined) ? Number(g.sold_price) : Number(g.sold_tf2_keys || g.tf2_keys_offered || 0);
    if (isEur) {
      totalSoldEur += priceVal;
    } else {
      totalSoldEur += (priceVal * tf2CashPrice);
    }
  });

  if (statAvailableGames) statAvailableGames.textContent = countListed;
  if (statPendingGames) statPendingGames.textContent = countPending;
  if (statPendingOfferKeys) statPendingOfferKeys.textContent = `${pendingKeys.toFixed(2)} TF2`;
  if (statPendingOfferCash) statPendingOfferCash.textContent = `(~${pendingCash.toFixed(2)} €)`;
  if (statSoldCount) statSoldCount.textContent = countSold;
  if (statSoldTotalCash) statSoldTotalCash.textContent = `(${totalSoldEur.toFixed(2)} €)`;

  if (tf2LiveBadgeFooter) tf2LiveBadgeFooter.textContent = `${tf2SteamPrice.toFixed(2)} €`;
  if (tf2CashBadgeFooter) tf2CashBadgeFooter.textContent = `${tf2CashPrice.toFixed(2)} €`;
}

function updateModalStatusBadge(status) {
  const badge = document.getElementById('modal-badge-status');
  if (!badge) return;

  const statusMap = {
    'listed': { text: 'Listado', icon: 'fa-solid fa-tag text-slate-300', class: 'bg-slate-800/90 border-slate-600 text-slate-200' },
    'pending': { text: 'En negociación', icon: 'fa-solid fa-handshake text-purple-400', class: 'bg-purple-950/90 border-purple-700 text-purple-300' },
    'issue': { text: 'Incidencia', icon: 'fa-solid fa-circle-exclamation text-rose-400', class: 'bg-rose-950/90 border-rose-800 text-rose-300' },
    'sold': { text: 'Vendido', icon: 'fa-solid fa-check text-emerald-400', class: 'bg-emerald-950/90 border-emerald-600 text-emerald-300' },
    'archived': { text: 'Archivado', icon: 'fa-solid fa-box-archive text-slate-400', class: 'bg-slate-900 border-slate-700 text-slate-400' }
  };

  const info = statusMap[status] || statusMap['listed'];
  badge.className = `${info.class} backdrop-blur border text-xs font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1 shadow-md`;
  badge.innerHTML = `<i class="${info.icon} text-xs"></i> <span>${info.text}</span>`;
}

function syncStatusPanels(status, game = null) {
  const soldContainer = document.getElementById('sold-keys-container');
  const issueContainer = document.getElementById('issue-container');

  if (status === 'sold') {
    if (soldContainer) {
      soldContainer.classList.remove('hidden');
      soldContainer.classList.add('space-y-2.5');
    }
    if (issueContainer) issueContainer.classList.add('hidden');

    if (game) {
      const curCurrency = game.sold_currency || 'TF2';
      if (editSoldCurrency) editSoldCurrency.value = curCurrency;
      if (editSoldCurrencyLabel) editSoldCurrencyLabel.textContent = curCurrency === 'EUR' ? '€' : 'TF2';
      if (editSoldPrice) {
        editSoldPrice.step = curCurrency === 'EUR' ? '0.01' : '0.25';
        const initVal = game.sold_price !== null && game.sold_price !== undefined ? game.sold_price : (game.sold_tf2_keys || getEffectiveOffer(game));
        editSoldPrice.value = initVal;
      }
      if (editSoldNote) editSoldNote.value = game.sold_note || '';
    }
  } else if (status === 'issue') {
    if (issueContainer) {
      issueContainer.classList.remove('hidden');
      issueContainer.classList.add('space-y-2');
    }
    if (soldContainer) {
      soldContainer.classList.add('hidden');
      soldContainer.classList.remove('space-y-2.5');
    }
    if (game && editIssueNote) {
      editIssueNote.value = game.issue_note || '';
    }
  } else {
    if (soldContainer) {
      soldContainer.classList.add('hidden');
      soldContainer.classList.remove('space-y-2.5');
    }
    if (issueContainer) {
      issueContainer.classList.add('hidden');
      issueContainer.classList.remove('space-y-2');
    }
  }
}

// Modal de edición (Estilo Tarjeta Visual Panorámica)
function openEditModal(gameId) {
  selectedGameId = gameId;
  const game = allGamesList.find(g => String(g.id) === String(gameId)) || games.find(g => String(g.id) === String(gameId));
  if (!game) return;

  // 1. Cabecera visual (Imagen, título, AppID)
  if (modalTitle) modalTitle.textContent = game.name;
  if (modalGameImg) {
    modalGameImg.src = game.steam_header_image || FALLBACK_GAME_SVG;
    modalGameImg.onerror = function() { this.src = FALLBACK_GAME_SVG; };
  }
  if (modalGameAppId) modalGameAppId.textContent = `AppID: ${game.steam_app_id || game.app_id || 'N/D'}`;

  // 2. Metadatos (Bundle, Jugadores)
  const modalGameBundle = document.getElementById('modal-game-bundle');
  const modalBundleText = document.getElementById('modal-bundle-text');
  if (modalGameBundle && modalBundleText) {
    if (game.bundle) {
      modalBundleText.textContent = game.bundle;
      modalGameBundle.classList.remove('hidden');
    } else {
      modalGameBundle.classList.add('hidden');
    }
  }

  const modalGamePlayers = document.getElementById('modal-game-players');
  const modalPlayersText = document.getElementById('modal-players-text');
  if (modalGamePlayers && modalPlayersText) {
    if (typeof game.steam_players_24h === 'number') {
      modalPlayersText.textContent = `${game.steam_players_24h.toLocaleString()} jugadores`;
      modalGamePlayers.classList.remove('hidden');
    } else {
      modalPlayersText.textContent = '-- jugadores';
    }
  }

  // 3. Badges flotantes en la cabecera
  const modalBadgePlatform = document.getElementById('modal-badge-platform');
  const modalPlatformText = document.getElementById('modal-platform-text');
  if (modalBadgePlatform && modalPlatformText) {
    if (game.platform && game.platform !== 'STEAM') {
      modalPlatformText.textContent = game.platform;
      modalBadgePlatform.classList.remove('hidden');
      modalBadgePlatform.classList.add('inline-flex');
    } else {
      modalBadgePlatform.classList.add('hidden');
      modalBadgePlatform.classList.remove('inline-flex');
    }
  }

  const modalBadgeDelisted = document.getElementById('modal-badge-delisted');
  if (modalBadgeDelisted) {
    if (game.is_delisted_steam) {
      modalBadgeDelisted.classList.remove('hidden');
      modalBadgeDelisted.classList.add('inline-flex');
    } else {
      modalBadgeDelisted.classList.add('hidden');
      modalBadgeDelisted.classList.remove('inline-flex');
    }
  }

  updateModalStatusBadge(game.status || 'listed');

  // 4. Enlaces directos externos
  const appId = game.steam_app_id || game.app_id;
  const modalLinkSteam = document.getElementById('modal-link-steam');
  const modalLinkSteamdb = document.getElementById('modal-link-steamdb');
  const modalLinkGgdeals = document.getElementById('modal-link-ggdeals');

  if (modalLinkSteam) {
    modalLinkSteam.href = appId ? `https://store.steampowered.com/app/${appId}/` : `https://store.steampowered.com/search/?term=${encodeURIComponent(game.name)}`;
  }
  if (modalLinkSteamdb) {
    modalLinkSteamdb.href = appId ? `https://steamdb.info/app/${appId}/` : `https://steamdb.info/search/?a=app&q=${encodeURIComponent(game.name)}`;
  }
  if (modalLinkGgdeals) {
    const slug = (game.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    modalLinkGgdeals.href = `https://gg.deals/game/${slug}/`;
  }

  // 5. Panel de Cotizaciones de Mercado
  const curOfficialVal = (typeof game.ggdeals_current_official === 'number') ? game.ggdeals_current_official : ((typeof game.steam_store_price === 'number') ? game.steam_store_price : null);
  const curKeyshopVal = (typeof game.ggdeals_current_keyshop === 'number') ? game.ggdeals_current_keyshop : ((typeof game.best_keyshop_price_eur === 'number') ? game.best_keyshop_price_eur : ((typeof game.kinguin_price_eur === 'number') ? game.kinguin_price_eur : null));
  
  const histOfficialVal = (typeof game.ggdeals_historical_official_low === 'number') ? game.ggdeals_historical_official_low : null;
  const histKeyshopVal = (typeof game.ggdeals_historical_keyshop_low === 'number') ? game.ggdeals_historical_keyshop_low : (curKeyshopVal || null);

  const modalFloorVal = document.getElementById('modal-floor-val');
  if (modalFloorVal) {
    if (typeof game.floor_price_eur === 'number' && game.floor_price_eur > 0) {
      const floorTf2 = (game.floor_price_eur / tf2CashPrice).toFixed(2);
      modalFloorVal.textContent = `${game.floor_price_eur.toFixed(2)} € (~${floorTf2} TF2)`;
    } else {
      modalFloorVal.textContent = '-- €';
    }
  }

  const curOfficialEl = document.getElementById('modal-cur-official');
  if (curOfficialEl) {
    curOfficialEl.textContent = (curOfficialVal !== null) ? `${curOfficialVal.toFixed(2)} €` : '--';
  }

  const curKeyshopEl = document.getElementById('modal-cur-keyshop');
  if (curKeyshopEl) {
    curKeyshopEl.textContent = (curKeyshopVal !== null) ? `${curKeyshopVal.toFixed(2)} €` : '--';
  }

  const curDiscountEl = document.getElementById('modal-cur-discount');
  if (curDiscountEl) {
    let disc = null;
    if (game.ggdeals_current_keyshop_discount) {
      disc = parseInt(game.ggdeals_current_keyshop_discount, 10);
    } else if (curOfficialVal && curKeyshopVal && curOfficialVal > curKeyshopVal) {
      disc = Math.round(((curOfficialVal - curKeyshopVal) / curOfficialVal) * 100);
    }
    if (disc !== null && !isNaN(disc) && disc > 0) {
      curDiscountEl.textContent = `-${disc}%`;
      curDiscountEl.className = "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-sans font-bold text-xs";
    } else {
      curDiscountEl.textContent = '--';
      curDiscountEl.className = "bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-sans font-bold text-xs";
    }
  }

  const histOfficialEl = document.getElementById('modal-hist-official');
  if (histOfficialEl) {
    histOfficialEl.textContent = (histOfficialVal !== null) ? `${histOfficialVal.toFixed(2)} €` : '--';
  }

  const histKeyshopEl = document.getElementById('modal-hist-keyshop');
  if (histKeyshopEl) {
    histKeyshopEl.textContent = (histKeyshopVal !== null) ? `${histKeyshopVal.toFixed(2)} €` : '--';
  }

  const histDiscountEl = document.getElementById('modal-hist-discount');
  if (histDiscountEl) {
    let histDisc = null;
    const baseOfficial = (typeof game.steam_store_price === 'number' && game.steam_store_price > 0) ? game.steam_store_price : (curOfficialVal || histOfficialVal);
    const lowestHist = (histKeyshopVal !== null && histKeyshopVal > 0) ? histKeyshopVal : histOfficialVal;
    if (baseOfficial && lowestHist && baseOfficial > lowestHist) {
      histDisc = Math.round(((baseOfficial - lowestHist) / baseOfficial) * 100);
    }
    if (histDisc !== null && !isNaN(histDisc) && histDisc > 0) {
      histDiscountEl.textContent = `-${histDisc}%`;
      histDiscountEl.className = "bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded font-sans font-bold text-xs";
    } else {
      histDiscountEl.textContent = '--';
      histDiscountEl.className = "bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-sans font-bold text-xs";
    }
  }

  // 6. Campos del Formulario
  if (editGameId) editGameId.value = game.id;
  if (editStatus) editStatus.value = game.status || 'listed';
  if (editTf2Keys) {
    if (game.status === 'listed') {
      editTf2Keys.value = (game.offer_price && Number(game.offer_price) > 0) ? game.offer_price : '';
      const askingData = getAskingPriceData(game);
      editTf2Keys.placeholder = askingData.type !== 'none' ? askingData.displayTf2.toFixed(2) : '0.00';
    } else {
      editTf2Keys.value = game.tf2_keys_offered || 0;
      editTf2Keys.placeholder = '0.00';
    }
  }
  if (editBuyerName) {
    editBuyerName.value = (game.status === 'listed' && !game.buyer_name) ? '' : (game.buyer_name || '');
  }

  syncStatusPanels(game.status || 'listed', game);

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

  const currentStatus = editStatus ? editStatus.value : 'listed';
  const isSold = (currentStatus === 'sold');
  const isIssue = (currentStatus === 'issue');

  const soldCurr = editSoldCurrency ? editSoldCurrency.value : 'TF2';
  const soldPriceVal = isSold && editSoldPrice && editSoldPrice.value ? parseFloat(editSoldPrice.value) : null;
  const soldNoteVal = isSold && editSoldNote && editSoldNote.value.trim() ? editSoldNote.value.trim() : null;
  const issueNoteVal = isIssue && editIssueNote && editIssueNote.value.trim() ? editIssueNote.value.trim() : null;
  const buyer = editBuyerName && editBuyerName.value.trim() ? editBuyerName.value.trim() : null;

  const tf2KeysVal = editTf2Keys && editTf2Keys.value ? (parseFloat(editTf2Keys.value) || 0) : 0;

  if (currentStatus === 'listed') {
    delete keyIncreases[selectedGameId];
    saveStoredData();
  }

  const payload = {
    tf2_keys_offered: tf2KeysVal,
    offer_price: tf2KeysVal,
    counter_price: currentStatus === 'listed' ? 0.0 : undefined,
    counter_increase_tf2: currentStatus === 'listed' ? 0.0 : undefined,
    status: currentStatus,
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
  const listToExport = (games && games.length > 0) ? games : allGamesList;
  if (!listToExport || listToExport.length === 0) {
    showToast("No hay juegos en la tabla para exportar.", "warning");
    return;
  }

  try {
    // Formateador de números (usamos punto decimal estándar)
    const formatDecimal = (val) => {
      if (val === null || val === undefined || val === '') return '';
      const num = typeof val === 'number' ? val : parseFloat(val);
      if (isNaN(num)) return '';
      return num.toString();
    };

    // Cabeceras de la plantilla CSV
    let csv = "GameID;Game;Bundle;Buyer;Offer;CounterOffer;AskingPrice;Increment;Revised;Accepted;SoldCurrency;SoldPrice\r\n";
    
    listToExport.forEach(g => {
      const gameId = g.id;
      const cleanName = (g.name || '')
        .replace(/;/g, ' - ')
        .replace(/"/g, '""')
        .trim();
      const cleanBundle = (g.bundle || '')
        .replace(/;/g, ' - ')
        .replace(/"/g, '""')
        .trim();
      const cleanBuyer = (g.buyer_name || '')
        .replace(/;/g, ' - ')
        .replace(/"/g, '""')
        .trim();

      const offer = Number(g.tf2_keys_offered || g.offer_price || 0);
      const increment = getIncrease(g);
      const counterOffer = offer + increment;
      const askData = getAskingPriceData(g);
      const askingPrice = askData.type !== 'none' ? askData.displayTf2 : '';
      const revised = g.is_reviewed ? 1 : 0;
      const accepted = (g.is_sold || g.status === 'sold') ? 1 : 0;
      const soldCurrency = g.sold_currency || 'TF2';
      
      let soldPrice = '';
      if (accepted === 1) {
        if (g.sold_price !== null && g.sold_price !== undefined) {
          soldPrice = g.sold_price;
        } else {
          soldPrice = g.sold_tf2_keys || counterOffer;
        }
      }

      csv += `"${gameId}";"${cleanName}";"${cleanBundle}";"${cleanBuyer}";${formatDecimal(offer)};${formatDecimal(counterOffer)};${formatDecimal(askingPrice)};${formatDecimal(increment)};${revised};${accepted};"${soldCurrency}";${formatDecimal(soldPrice)}\r\n`;
    });

    // BOM UTF-8 (\uFEFF) para compatibilidad nativa con Microsoft Excel en español/Windows
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `steamtrades_${currentTableFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`¡Tabla exportada con éxito! (${listToExport.length} juegos)`, "success");
  } catch (err) {
    console.error("Error al exportar CSV:", err);
    showToast("Error al generar el archivo CSV.", "error");
  }
}

// ==========================================
// Generador de Tabla para SteamTrades
// ==========================================
function openSteamTradesModal() {
  if (!modalSteamtradesExport) return;
  modalSteamtradesExport.classList.remove('hidden');
  modalSteamtradesExport.classList.add('flex');
  if (stCopyStatus) stCopyStatus.classList.add('hidden');
  refreshSteamTradesMarkdown();
}

function closeSteamTradesModal() {
  if (!modalSteamtradesExport) return;
  modalSteamtradesExport.classList.add('hidden');
  modalSteamtradesExport.classList.remove('flex');
  if (stCopyStatus) stCopyStatus.classList.add('hidden');
}

function generateSteamTradesMarkdownContent() {
  const scope = stExportScope ? stExportScope.value : 'listed_all';
  const priceFormat = stExportPriceFormat ? stExportPriceFormat.value : 'tf2_eur';
  const spacing = stExportSpacing ? stExportSpacing.value : 'aligned';

  let listToExport = [];
  if (scope === 'listed_page') {
    const term = (searchInput ? searchInput.value : '').toLowerCase().trim();
    let list = [...games];
    if (term) list = list.filter(g => g.name.toLowerCase().includes(term));
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    listToExport = list.slice(startIdx, startIdx + PAGE_SIZE);
  } else if (scope === 'current_view') {
    listToExport = [...games];
  } else {
    // listed_all: todos los juegos listados en catálogo
    listToExport = allGamesList.filter(g => g.status === 'listed');
    if (listToExport.length === 0) {
      listToExport = allGamesList.filter(g => !g.is_sold && g.status !== 'sold');
    }
  }

  if (listToExport.length === 0) {
    return { markdown: "No hay juegos listados para exportar.", count: 0 };
  }

  // Ordenar alfabéticamente por nombre
  listToExport.sort((a, b) => a.name.localeCompare(b.name));

  const includePrice = (priceFormat !== 'none');
  const priceHeader = 'Precio Salida';

  const rowsData = listToExport.map(g => {
    const gameName = g.name.trim();
    const bundleName = (g.bundle && g.bundle.trim()) ? g.bundle.trim() : '-';
    let priceText = '';
    if (includePrice) {
      const ask = getAskingPriceData(g);
      if (ask.type !== 'none') {
        if (priceFormat === 'tf2_only') {
          priceText = `${ask.displayTf2.toFixed(2)} TF2`;
        } else if (priceFormat === 'eur_only') {
          priceText = `${ask.displayEur.toFixed(2)} €`;
        } else {
          priceText = `${ask.displayTf2.toFixed(2)} TF2 (~${ask.displayEur.toFixed(2)} €)`;
        }
      } else {
        priceText = 'A convenir';
      }
    }
    return { game: gameName, bundle: bundleName, price: priceText };
  });

  let markdown = '';
  if (spacing === 'compact') {
    if (includePrice) {
      markdown += `| Game | Bundle | ${priceHeader} |\n`;
      markdown += `|:---|:---|:---|\n`;
      rowsData.forEach(r => {
        markdown += `| ${r.game} | ${r.bundle} | ${r.price} |\n`;
      });
    } else {
      markdown += `| Game | Bundle |\n`;
      markdown += `|:---|:---|\n`;
      rowsData.forEach(r => {
        markdown += `| ${r.game} | ${r.bundle} |\n`;
      });
    }
  } else {
    // Espaciado ancho alineado estilo SteamTrades
    const maxGame = Math.max(50, ...rowsData.map(r => r.game.length));
    const maxBundle = Math.max(30, ...rowsData.map(r => r.bundle.length));
    const maxPrice = includePrice ? Math.max(priceHeader.length, ...rowsData.map(r => r.price.length)) : 0;

    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - str.length));

    if (includePrice) {
      markdown += `| ${pad('Game', maxGame)} | ${pad('Bundle', maxBundle)} | ${pad(priceHeader, maxPrice)} |\n`;
      markdown += `|:${'-'.repeat(maxGame + 1)}|:${'-'.repeat(maxBundle + 1)}|:${'-'.repeat(maxPrice + 1)}|\n`;
      rowsData.forEach(r => {
        markdown += `| ${pad(r.game, maxGame)} | ${pad(r.bundle, maxBundle)} | ${pad(r.price, maxPrice)} |\n`;
      });
    } else {
      markdown += `| ${pad('Game', maxGame)} | ${pad('Bundle', maxBundle)} |\n`;
      markdown += `|:${'-'.repeat(maxGame + 1)}|:${'-'.repeat(maxBundle + 1)}|\n`;
      rowsData.forEach(r => {
        markdown += `| ${pad(r.game, maxGame)} | ${pad(r.bundle, maxBundle)} |\n`;
      });
    }
  }

  return { markdown, count: rowsData.length };
}

function refreshSteamTradesMarkdown() {
  const result = generateSteamTradesMarkdownContent();
  if (stMarkdownOutput) stMarkdownOutput.value = result.markdown;
  if (stPreviewCount) stPreviewCount.textContent = result.count;
}

function copySteamTradesMarkdown() {
  if (!stMarkdownOutput) return;
  const text = stMarkdownOutput.value;
  if (!text) return;

  const showSuccessFeedback = () => {
    if (stCopyStatus) {
      stCopyStatus.classList.remove('hidden');
      setTimeout(() => { if (stCopyStatus) stCopyStatus.classList.add('hidden'); }, 3000);
    }
    if (btnCopyStMarkdown) {
      const origHtml = btnCopyStMarkdown.innerHTML;
      btnCopyStMarkdown.innerHTML = `<i class="fa-solid fa-check text-white"></i> ¡Copiado!`;
      btnCopyStMarkdown.classList.replace('bg-amber-600', 'bg-emerald-600');
      btnCopyStMarkdown.classList.replace('hover:bg-amber-500', 'hover:bg-emerald-500');
      setTimeout(() => {
        if (btnCopyStMarkdown) {
          btnCopyStMarkdown.innerHTML = origHtml;
          btnCopyStMarkdown.classList.replace('bg-emerald-600', 'bg-amber-600');
          btnCopyStMarkdown.classList.replace('hover:bg-emerald-500', 'hover:bg-amber-500');
        }
      }, 2000);
    }
    showToast("¡Tabla copiada al portapapeles para SteamTrades!", "success");
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showSuccessFeedback).catch(() => {
      stMarkdownOutput.select();
      document.execCommand('copy');
      showSuccessFeedback();
    });
  } else {
    stMarkdownOutput.select();
    document.execCommand('copy');
    showSuccessFeedback();
  }
}

function downloadSteamTradesMarkdown() {
  if (!stMarkdownOutput) return;
  const text = stMarkdownOutput.value;
  if (!text) return;

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `steamtrades_catalogo_${new Date().toISOString().slice(0, 10)}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("¡Archivo de tabla para SteamTrades descargado!", "success");
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
            badgeHtml = `<span class="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-700/60 font-semibold text-[10px]">En negociación (+${inc} TF2)</span>`;
          } else {
            badgeHtml = `<span class="px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-700 font-semibold text-[10px]">Listado</span>`;
          }

          return `
            <div class="flex items-center justify-between p-1.5 bg-slate-950/60 rounded-lg border border-slate-800/80 gap-2 hover:bg-slate-950 transition">
              <div class="flex items-center gap-2 truncate min-w-0">
                <span class="text-slate-500 font-mono font-bold text-[10px]">#${r.game_id}</span>
                <span class="text-slate-200 font-sans truncate font-medium text-xs">${escapeHtml(r.game_name || 'Juego')}</span>
                ${r.buyer ? `<span class="text-slate-500 text-[10px]">(${escapeHtml(r.buyer)})</span>` : ''}
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
