# Steam Trades & Keys Valuation

Aplicación personal para la **valoración, análisis de rentabilidad, arbitraje y generación inteligente de contraofertas** de ofertas individuales de claves de Steam recibidas en operaciones de intercambio (SteamTrades, Barter.vg, etc.) en **Mann Co. Supply Crate Keys (TF2 Keys)**.

---

## 1. ¿Qué hace la aplicación?

* **Cotización en Vivo de TF2 Keys:** Consulta el precio en tiempo real de las llaves TF2 en el Mercado de la Comunidad de Steam y calcula el valor neto tras comisiones (13.03%) y valor Cash/fiat (80%).
* **Escaneo Automatizado Multifuente:** Consulta precios oficiales, deslistados y jugadores 24h concurrentes en Steam Store API / SteamDB, y scraping de ofertas mínimas y mínimos históricos en GG.deals.
* **Análisis de Suelo y Arbitraje:** Identifica el suelo mínimo de mercado y calcula las ganancias/pérdidas del vendedor frente al comprador.
* **Doble Interfaz:**
  * **Vista de Tarjetas (`/`):** Comparador de precios de 4 columnas (*Tipo, Oficial, Keyshops, Dto.*), halo de edición y footer con métricas consolidadas.
  * **Vista de Tabla (`/table`):** Generador reactivo de contraofertas, columna dedicada de *Comprador*, ordenación en vivo por cabeceras y exportación/importación CSV compatible con Excel.
* **Persistencia Relacional SQLite:** Modelos ORM estructurados en SQLite vía SQLAlchemy con soporte de múltiples compradores (`xMjalino`, etc.) y registro de juegos vendidos.

---

## 2. Estructura del Proyecto

```text
steamtrades/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py           # Endpoints REST (/api/games, /api/summary, /api/health)
│   │   ├── core/
│   │   │   └── config.py           # Configuración central y rutas
│   │   ├── db/
│   │   │   ├── session.py          # SQLAlchemy Session y Engine (SQLite)
│   │   │   └── init_db.py          # Inicialización y sembrado de base de datos
│   │   ├── models/
│   │   │   ├── game.py             # Modelo ORM Game
│   │   │   └── settings.py         # Modelo ORM Settings
│   │   ├── schemas/
│   │   │   └── game.py             # Esquemas de validación Pydantic v2
│   │   ├── services/
│   │   │   ├── steam_service.py    # Integración con Steam Store API y SteamDB
│   │   │   └── price_service.py    # Motor de scraping GG.deals y cálculo de suelo
│   │   ├── tools/
│   │   │   └── sync_market.py      # Herramienta CLI de sincronización masiva
│   │   └── main.py                 # FastAPI App principal
│   ├── tests/
│   │   └── test_api.py             # Suite de tests con pytest y TestClient
│   ├── requirements.txt            # Dependencias del backend
│   └── Dockerfile                  # Contenedor Docker para backend Python
│
├── frontend/
│   ├── src/
│   │   ├── index.html              # Vista de Tarjetas
│   │   ├── table.html              # Vista de Tabla y Contraofertas
│   │   ├── styles.css              # Estilos Tailwind personalizados
│   │   ├── app.js                  # Lógica del dashboard de tarjetas
│   │   └── table.js                # Lógica de tabla interactiva y CSV
│   ├── package.json                # Metadatos del frontend
│   └── Dockerfile                  # Contenedor Nginx con reverse proxy
│
├── data/
│   ├── games_db.json               # Datos iniciales para sembrado automático
│   └── settings.json               # Configuración inicial de cotizaciones
│
├── compose.yml                     # Orquestación de servicios Docker Compose
├── .dockerignore
├── .gitignore
├── .env.example
├── pytest.ini
├── run.py                          # Script de ejecución local rápido
└── README.md
```

---

## 3. Requisitos

* **PC (Desarrollo):** Python 3.10+ o Docker Desktop.
* **Raspberry Pi (Producción):** DietPi / Raspberry Pi OS de 64 bits con Docker y Docker Compose instalados.

---

## 4. Cómo ejecutarla localmente (Desarrollo en PC)

1. **Crear y activar entorno virtual:**
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. **Instalar dependencias:**
```powershell
pip install -r backend/requirements.txt
```

3. **Inicializar base de datos SQLite:**
```powershell
python -m backend.app.db.init_db
```

4. **Arrancar la aplicación:**
```powershell
python run.py
```
* **Vista Tarjetas:** `http://localhost:8000/`
* **Vista Tabla:** `http://localhost:8000/table`
* **API Docs (Swagger):** `http://localhost:8000/docs`
* **Healthcheck:** `http://localhost:8000/health`

---

## 5. Variables de Entorno

Crear el archivo `.env` a partir de la plantilla:
```bash
cp .env.example .env
```

| Variable | Descripción | Valor por defecto (Local) | Valor Producción (DietPi) |
| :--- | :--- | :--- | :--- |
| `DATA_PATH` | Ruta absoluta persistente en el host | `./data` | `/mnt/dietpi_userdata/apps/steamtrades/data` |
| `FRONTEND_PORT` | Puerto HTTP del frontend | `8333` | `8333` |
| `BACKEND_PORT` | Puerto HTTP del backend API | `8334` | `8334` |
| `DEFAULT_TF2_STEAM_PRICE` | Cotización base Steam (€) | `2.02` | `2.02` |
| `DEFAULT_TF2_CASH_PRICE` | Cotización base Cash (€) | `1.62` | `1.62` |
| `DEFAULT_STEAM_FEE_PERCENT` | Comisión mercado Steam (%) | `13.03` | `13.03` |

---

## 6. Cómo construir las imágenes con Docker

```bash
docker compose build
```

---

## 7. Cómo levantar los servicios con Compose

```bash
docker compose up -d
```

---

## 8. Puertos

* **Frontend (Nginx Web):** `8333` (Mapeado a `${FRONTEND_PORT:-8333}`)
* **Backend (FastAPI REST API):** `8334` (Mapeado a `${BACKEND_PORT:-8334}`)

---

## 9. Datos Persistentes

Siguiendo la convención obligatoria, todos los datos persistentes (base de datos SQLite `steamtrades.db`) se almacenan **fuera del filesystem efímero del contenedor**:

* **Ruta en Raspberry Pi:** `/mnt/dietpi_userdata/apps/steamtrades/data`
* **Ruta montada dentro del contenedor:** `/app/data`

---

## 10. Primera Instalación en Raspberry Pi (DietPi)

1. **Crear la estructura de directorios estándar:**
```bash
sudo mkdir -p /opt/apps
sudo mkdir -p /mnt/dietpi_userdata/apps/steamtrades/data
```

2. **Clonar el repositorio en `/opt/apps`:**
```bash
cd /opt/apps
git clone https://github.com/milio3/steamtrades.git steamtrades
cd steamtrades
```

3. **Configurar el archivo `.env`:**
```bash
cp .env.example .env
```
*(Verificar que `DATA_PATH=/mnt/dietpi_userdata/apps/steamtrades/data` esté definido en `.env`)*.

4. **Copiar datos semilla iniciales:**
```bash
cp data/games_db.json /mnt/dietpi_userdata/apps/steamtrades/data/
cp data/settings.json /mnt/dietpi_userdata/apps/steamtrades/data/
```

5. **Construir y levantar:**
```bash
docker compose up -d --build
```

---

## 11. Actualización desde GitHub

Flujo de actualización estándar en la Raspberry Pi sin pérdida de datos persistentes:

```bash
cd /opt/apps/steamtrades
git pull
docker compose up -d --build
```

---

## 12. Logs

Para monitorizar los registros de ejecución:
```bash
# Ver logs en tiempo real de todos los servicios
docker compose logs -f

# Ver logs solo del backend
docker compose logs -f backend

# Ver logs solo del frontend Nginx
docker compose logs -f frontend
```

---

## 13. Backups

Para realizar una copia de seguridad consistente de la base de datos SQLite:

```bash
# Copia en caliente del archivo SQLite hacia almacenamiento externo o backups
cp /mnt/dietpi_userdata/apps/steamtrades/data/steamtrades.db /mnt/dietpi_userdata/backups/steamtrades_$(date +%Y%m%d_%H%M%S).db
```

> [!NOTE]
> No guardes el único backup en el mismo disco físico que los datos originales.

---

## 14. Migraciones y Base de Datos

La aplicación utiliza **SQLAlchemy** con inicialización automática:
* Al arrancar, si `steamtrades.db` no existe, `init_database()` crea automáticamente las tablas y migra los 107 juegos desde `games_db.json`.
* Los datos persistentes residen en `/mnt/dietpi_userdata/apps/steamtrades/data/steamtrades.db` y se conservan intactos entre reinicios y actualizaciones.

---

## 15. Cómo detener o eliminar la aplicación

```bash
# Detener contenedores
docker compose stop

# Detener y eliminar contenedores y redes (los datos en /mnt/... NO se eliminan)
docker compose down
```

---

## 16. Despliegue con Portainer (Stacks)

1. En Portainer, ve a **Stacks** $\rightarrow$ **Add stack**.
2. Nombre: `steamtrades`.
3. Selecciona **Repository**:
   * Repository URL: `https://github.com/milio3/steamtrades.git`
   * Compose path: `compose.yml`
4. En **Environment variables**, añade:
   * `DATA_PATH=/mnt/dietpi_userdata/apps/steamtrades/data`
   * `FRONTEND_PORT=8333`
   * `BACKEND_PORT=8334`
5. Pulsa en **Deploy the stack**.

---

## 🧪 Tests Automatizados

Ejecutar la suite completa de pruebas:
```bash
pytest backend/tests/ -v
```

---

## 📄 Licencia

Código abierto bajo licencia MIT.
