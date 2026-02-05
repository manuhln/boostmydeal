# Orchestrates Dockerfile
# Python FastAPI/Vocode telephony service

# ============================================
# Stage 1: Builder
# ============================================
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies (including audio libs for vocode)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libffi-dev \
    portaudio19-dev \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================
# Stage 2: Production Runner
# ============================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime dependencies (audio libs required by vocode/pyaudio)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    portaudio19-dev \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 vocodeapp && \
    useradd --system --uid 1001 --gid vocodeapp --create-home vocodeapp

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY --chown=vocodeapp:vocodeapp . .

# Create necessary directories with proper permissions
RUN mkdir -p /tmp /app/nltk_data && \
    chown -R vocodeapp:vocodeapp /tmp /app/nltk_data

# Download NLTK data as root before switching to non-root user
RUN python -c "import nltk; nltk.download('punkt', download_dir='/app/nltk_data', quiet=True)"

# Set NLTK data path for the application
ENV NLTK_DATA=/app/nltk_data

# Set environment
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=3000

# Switch to non-root user
USER vocodeapp

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the FastAPI server with gunicorn for production
CMD ["gunicorn", "-w", "1", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:3000", "main:app"]
