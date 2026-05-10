FROM python:3.11-slim

WORKDIR /app

# Dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Dependencias Python
COPY pyproject.toml .
RUN pip install --no-cache-dir ".[prod]" 2>/dev/null || pip install --no-cache-dir .

# Código fuente
COPY . .

# Crear directorio de datos (SQLite, ignorado en producción con Postgres)
RUN mkdir -p data

EXPOSE 8000

# Aplica migraciones y arranca el servidor
CMD alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000
