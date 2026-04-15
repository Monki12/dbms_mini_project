# Multi-stage production readiness for running FastAPI Backend with Oracle bindings

FROM python:3.11-slim-bookworm AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final target layer
FROM python:3.11-slim-bookworm AS runtime

# Oracledb Thin mode does NOT require Oracle Instant Client natively!
# By bypassing the thick 250MB binary, this Runtme image remains ~130MB.
# Create a robust unprivileged container user
RUN useradd -m clinic_user
WORKDIR /home/clinic_user/api

# Pull binaries generated in builder phase
COPY --from=builder /root/.local /home/clinic_user/.local

# Adjust paths manually
ENV PATH=/home/clinic_user/.local/bin:$PATH

COPY . .

# Adjust permissions securely to local non-ROOT mapped context
RUN chown -R clinic_user:clinic_user /home/clinic_user/api
USER clinic_user

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=15s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Bound explicitly for Prod. (Uvicorn workers scaled based on available vCPUs implicitly)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
