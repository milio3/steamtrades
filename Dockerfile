FROM python:3.12-slim

WORKDIR /app

# Instalar curl para utilidades si fueran necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copiar backend y frontend completo
COPY backend/app/ ./backend/app/
COPY backend/tests/ ./backend/tests/
COPY frontend/src/ ./frontend/src/

# Directorio de datos para volumen persistente SQLite
RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
