FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY apps/agents/requirements.txt .
# Excluimos playwright del build de producción (solo lo usa el scraper, no la API)
RUN grep -v "^playwright" requirements.txt > requirements-prod.txt && \
    pip install --no-cache-dir -r requirements-prod.txt

COPY apps/agents/ .

EXPOSE 8000

CMD uvicorn api:app --host 0.0.0.0 --port ${PORT:-8000}
