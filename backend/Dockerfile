FROM python:3.12-slim

WORKDIR /app

# Instalar dependencias del sistema si fueran necesarias
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Actualizar pip e instalar requerimientos Python
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --disable-pip-version-check -r requirements.txt

# Copiar código del backend
COPY app/ ./backend/app/
COPY tests/ ./backend/tests/

# Crear carpeta para volumen de datos persistente SQLite
RUN mkdir -p /app/data

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
