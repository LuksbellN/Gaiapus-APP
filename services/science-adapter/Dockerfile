FROM ghcr.io/astral-sh/uv:0.11.2 AS uv
FROM python:3.13.14-slim-bookworm
COPY --from=uv /uv /uvx /bin/
WORKDIR /app/services/science-adapter
COPY services/science-adapter/pyproject.toml services/science-adapter/uv.lock ./
RUN uv sync --frozen --no-dev
COPY services/science-adapter/adapter.py services/science-adapter/source-pin.json ./
COPY services/science-adapter/v7.py services/science-adapter/v7-pin.json ./
COPY services/science-adapter/delivery ./delivery
COPY services/science-adapter/vendor ./vendor
COPY packages/contracts/upstream /app/packages/contracts/upstream
ENV PATH="/app/services/science-adapter/.venv/bin:$PATH"
RUN useradd --uid 10001 --create-home science
USER science
EXPOSE 8001
CMD ["uvicorn", "adapter:from_env", "--factory", "--host", "0.0.0.0", "--port", "8001", "--workers", "1"]
