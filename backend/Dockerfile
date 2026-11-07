# ==============================================================================
# CodeMate AI Backend — Production Dockerfile
# Multi-stage lightweight Python container with non-root security user.
# ==============================================================================

FROM python:3.11-slim AS builder

WORKDIR /build

# Install build dependencies including PostgreSQL client headers
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final Runtime Image
FROM python:3.11-slim AS runner

WORKDIR /app

# Install runtime PostgreSQL client library
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create unprivileged system user
RUN groupadd -g 10001 codemate && \
    useradd -u 10001 -g codemate -s /bin/bash -m codemate

# Copy python dependencies from builder
COPY --from=builder /root/.local /home/codemate/.local
ENV PATH=/home/codemate/.local/bin:$PATH
ENV PYTHONPATH=/app

# Copy application source code and migrations
COPY --chown=codemate:codemate app/ /app/app/
COPY --chown=codemate:codemate alembic/ /app/alembic/
COPY --chown=codemate:codemate alembic.ini /app/alembic.ini

# Create persistent data directory for SQLite / local caches
RUN mkdir -p /app/data && chown -R codemate:codemate /app/data

USER codemate

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')" || exit 1

ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers", "--forwarded-allow-ips", "*"]

