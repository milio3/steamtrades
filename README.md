# Steam Trades & Keys Valuation

Aplicación profesional para la **valoración, análisis de rentabilidad, arbitraje y generación inteligente de contraofertas** de lotes de claves de Steam recibidas en operaciones de intercambio (SteamTrades, Barter.vg, etc.) en **Mann Co. Supply Crate Keys (TF2 Keys)**.

---

## 🏗️ Arquitectura del Proyecto

```text
steamtrades/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py           # Endpoints REST (/api/games, /api/summary, etc.)
│   │   ├── core/
│   │   │   └── config.py           # Configuración y variables de entorno
│   │   ├── db/
│   │   │   ├── session.py          # SQLAlchemy Session y Engine (SQLite)
│   │   │   └── init_db.py          # Migración e inicialización de la base de datos
│   │   ├── models/
│   │   │   ├── game.py             # Modelo ORM Game
│   │   │   └── settings.py         # Modelo ORM Settings
│   │   ├── schemas/
│   │   │   └── game.py             # Esquemas Pydantic v2
│   │   ├── services/
│   │   │   ├── steam_service.py    # Integración con Steam Store API y SteamDB
│   │   │   └── price_service.py    # Motor de scraping GG.deals y cálculo de suelo
│   │   ├── tools/
│   │   │   └── sync_market.py      # Herramienta CLI para sincronización masiva
│   │   └── main.py                 # FastAPI App y servicio de estáticos
│   ├── tests/
│   │   └── test_api.py             # Tests unitarios e integración con Pytest
│   ├── requirements.txt            # Dependencias del backend
│   └── Dockerfile                  # Contenedor Docker para FastAPI
│
├── frontend/
│   ├── src/
│   │   ├── index.html              # Vista de Tarjetas
│   │   ├── table.html              # Vista de Tabla y Contraofertas
│   │   ├── styles.css              # Estilos personalizados Tailwind
│   │   ├── app.js                  # Lógica del dashboard de tarjetas
│   │   └── table.js                # Lógica de tabla interactiva y exportación CSV
│   ├── package.json                # Metadatos del frontend
│   └── Dockerfile                  # Contenedor Nginx con reverse proxy
│
├── data/
│   ├── steamkeys.db                # Base de datos relacional SQLite
│   ├── games_db.json               # Datos iniciales migrados
│   └── settings.json               # Configuración de cotizaciones
│
├── compose.yml                     # Orquestación con Docker Compose
├── .dockerignore
├── .gitignore
├── .env.example
├── pytest.ini
├── run.py                          # Ejecutor local rápido
└── README.md
```

---

## 🚀 Características Principales

* **Cotización en Vivo de TF2 Keys:**
  * Obtención automática del precio en el Mercado de Steam y cálculo del valor neto tras comisiones de Steam (13.03%) y valor Cash/fiat de mercado.
* **Escaneo Automatizado Multifuente:**
  * **Steam Store API:** Precios oficiales vigentes, detección de juegos deslistados/retirados de la tienda, enlaces directos e imágenes.
  * **SteamDB:** Monitorización de jugadores concurrentes en las últimas 24 horas.
  * **GG.deals:** Precios oficiales actuales, ofertas mínimas en tiendas de claves (Keyshops) y **mínimos históricos** oficiales y de mercado.
* **Persistencia Robusta en SQLite con SQLAlchemy:**
  * Modelo ORM estructurado con persistencia de aumentos de contraoferta, revisiones, marcas de venta, precios acordados y lotes.
* **Dos Vistas Complementarias:**
  * **Vista de Tarjetas (`/`):** Fichas visuales interactivas, comparador de 4 columnas (*Tipo, Oficial, Keyshops, Dto.*), halo de edición y footer financiero consolidador.
  * **Vista de Tabla (`/table`):** Tabla con cálculo en tiempo real de contraofertas, columna dedicada de *Lote*, cabeceras ordenables, protección de campos revisados y exportación.
* **Gestión de Lotes & Ventas:**
  * Asignación por lote/paquete de juegos (ej. `xMjalino`, `Lote_Agosto`).
  * Registro de juegos vendidos con precio final acordado en TF2 keys y filtro dedicado de *Vendidos*.
* **Exportación CSV Optimizada para Excel:**
  * Delimitador `;`, comas decimales `,` y BOM UTF-8 para apertura nativa e inmediata en Excel en español.

---

## 🛠️ Puesta en Marcha

### Opción A: Despliegue con Docker Compose (Recomendado)

1. **Configurar variables (Opcional para producción / Raspberry Pi):**
```bash
cp .env.example .env
```
> **Despliegue en Raspberry Pi (DietPi):**
> Edita `.env` y define la ruta persistente de DietPi:
> ```env
> DATA_PATH=/mnt/dietpi_userdata/steamtrades/data
> FRONTEND_PORT=80
> BACKEND_PORT=8000
> ```

2. **Levantar los servicios:**
```bash
docker compose up --build -d
```
* **Frontend:** `http://localhost` (o la IP de tu Raspberry Pi)
* **Vista Tabla:** `http://localhost/table`
* **API REST Docs:** `http://localhost:8000/docs`

### Opción B: Ejecución Local en Entorno Virtual

1. **Crear entorno virtual e instalar dependencias:**
```bash
python -m venv .venv
.\.venv\Scripts\Activate.ps1   # En Windows
pip install -r backend/requirements.txt
```

2. **Inicializar base de datos SQLite:**
```bash
python -m backend.app.db.init_db
```

3. **Ejecutar la aplicación:**
```bash
python run.py
```
* Abrir en el navegador: `http://localhost:8000/` y `http://localhost:8000/table`.

---

## 🧪 Tests Automatizados

Ejecutar la suite completa de pruebas unitarias y de integración:
```bash
pytest backend/tests/ -v
```

---

## 🔧 Herramientas CLI

Para sincronizar todos los precios y datos de mercado por consola:
```bash
python -m backend.app.tools.sync_market
```

---

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT.
