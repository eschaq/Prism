# Stage 1: Build React frontend
FROM node:20-slim AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN mkdir -p public/assets && \
    curl -L "https://huggingface.co/spaces/eschaq/Prism/resolve/main/frontend/public/assets/prism-logo.png" -o public/assets/prism-logo.png && \
    curl -L "https://huggingface.co/spaces/eschaq/Prism/resolve/main/frontend/public/assets/prism-backround.png" -o public/assets/prism-backround.png
RUN npm run build

# Stage 2: Python runtime
FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy data (demo CSVs, text files)
COPY data/ ./data/

# Copy built frontend from stage 1 (includes downloaded assets)
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Backend modules are imported directly from /app/backend
ENV PYTHONPATH=/app/backend

# HuggingFace Spaces expects port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
