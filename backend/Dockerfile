# syntax=docker/dockerfile:1.7
# Build image pour le backend FastAPI d'Assist360.
# Python 3.13 slim, ~600MB final avec modèle d'embeddings inclus.

FROM python:3.13-slim AS runtime

# Outils système nécessaires : curl pour le healthcheck, libgomp1 pour ONNX runtime (fastembed)
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl \
      libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installation des deps Python en couche séparée (cache plus efficace)
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Pre-download du modèle d'embeddings (~220MB) pour que le premier /chat soit instantané.
# Le modèle est mis en cache dans /root/.cache/fastembed et reste dans l'image.
RUN python -c "from fastembed import TextEmbedding; TextEmbedding(model_name='sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"

# Code applicatif et données pré-analysées
COPY . .

EXPOSE 8000

# Healthcheck pour Coolify / orchestrateur
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# Pas de --reload en prod
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
