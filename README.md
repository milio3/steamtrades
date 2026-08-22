# Steam Trades & Keys Valuation

Aplicación web profesional para la **valoración, análisis de rentabilidad, arbitraje y generación inteligente de contraofertas** de lotes de claves de Steam recibidas en operaciones de intercambio (SteamTrades, Barter.vg, etc.) en **Mann Co. Supply Crate Keys (TF2 Keys)**.

---

## 🚀 Características Principales

* **Cotización en Vivo de TF2 Keys:**
  * Obtención automática del precio en el Mercado de Steam y cálculo del valor neto tras comisiones de Steam (13.03%) y valor Cash/fiat de mercado.
* **Escaneo Automatizado Multifuente:**
  * **Steam Store API:** Precios oficiales vigentes, detección de juegos deslistados/retirados de la tienda, enlaces directos e imágenes.
  * **SteamDB:** Monitorización de jugadores activos concurrentes en las últimas 24 horas.
  * **GG.deals:** Precios oficiales actuales, ofertas mínimas en tiendas de claves (Keyshops) y **mínimos históricos** oficiales y de mercado.
* **Análisis de Suelo y Arbitraje:**
  * Identificación automática del **Suelo Mínimo de Mercado** (el precio más bajo entre keyshops e históricos oficiales).
  * Detección de tratos abusivos con cálculo de pérdidas para el vendedor frente a suelo de mercado.
* **Dos Vistas Complementarias:**
  * **Vista de Tarjetas:** Fichas visuales con carátula interactiva, comparador de precios de 4 columnas (*Tipo, Oficial, Keyshops, Dto.*), halo de edición y footer con métricas financieras consolidadas.
  * **Vista de Tabla & Contraoferta:** Tabla dinámica y ordenable con cálculo en tiempo real de contraofertas, balances de rentabilidad, control de estado *Revisado*, protección de campos editados y exportación.
* **Gestión de Lotes de Juegos:**
  * Asignación y filtrado por nombre de lote/paquete (ej. `xMjalino`, `Lote_Agosto`) para gestionar múltiples ofertas de compradores simultáneamente.
* **Gestión de Juegos Vendidos:**
  * Registro de juegos vendidos con precio final en llaves TF2 acordado.
  * Filtro dedicado de *Vendidos* en la vista de tarjetas.
* **Alta Instantánea de Nuevos Juegos:**
  * Añade cualquier juego simplemente pegando el enlace de Steam Store.
* **Exportación CSV Optimizada:**
  * Generación de CSV con separador `;`, comas decimales `,` y codificación UTF-8 con BOM para apertura nativa y directa en Microsoft Excel en español.

---

## 🛠️ Tecnologías Utilizadas

* **Backend:** Python 3.10+, [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/), Pydantic, Requests, BeautifulSoup4.
* **Frontend:** HTML5, Modern Vanilla JavaScript, [Tailwind CSS CDN](https://tailwindcss.com/), [Font Awesome](https://fontawesome.com/).
* **Base de Datos:** Persistencia JSON estructurada en disco con recarga y guardado automático.

---

## 📦 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/milio3/steamtrades.git
cd steamtrades
```

### 2. Crear y activar entorno virtual
```bash
# En Windows (PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Iniciar la aplicación
```bash
python run.py
```
O directamente con Uvicorn:
```bash
uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

Abre tu navegador en:
* **Vista de Tarjetas:** `http://localhost:8000/`
* **Vista de Tabla:** `http://localhost:8000/table`

---

## 📂 Estructura del Proyecto

```text
├── backend/
│   ├── app.py              # Endpoints API REST y servidor web FastAPI
│   ├── models.py           # Modelos de datos Pydantic
│   ├── price_service.py    # Servicio de scraping GG.deals y cálculo de suelo
│   ├── steam_service.py    # Consulta API oficial de Steam y jugadores SteamDB
│   └── data_loader.py      # Gestor de base de datos JSON
├── data/
│   ├── games_db.json       # Base de datos persistente de juegos y ofertas
│   └── settings.json       # Configuración de cotizaciones de TF2
├── frontend/
│   ├── index.html          # Interfaz de Tarjetas
│   ├── table.html          # Interfaz de Tabla y Contraofertas
│   ├── app.js              # Controlador JS para tarjetas y modales
│   ├── table.js            # Controlador JS para tabla, ordenación y CSV
│   └── styles.css          # Estilos personalizados y paleta sobria
├── requirements.txt        # Dependencias de Python
├── run.py                  # Script de inicio rápido
└── README.md
```

---

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT.
