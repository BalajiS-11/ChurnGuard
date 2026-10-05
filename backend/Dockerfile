FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for C-extensions, libgomp for XGBoost/LightGBM
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy source code and artifacts
COPY backend /app/backend
COPY ml /app/ml
COPY churnguard.db /app/churnguard.db

ENV PYTHONPATH=/app
ENV PORT=8000
ENV ENVIRONMENT=production

EXPOSE 8000

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
