FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && addgroup --system appgroup \
    && adduser --system --ingroup appgroup --home /app appuser

COPY . .

RUN mkdir -p /app/instance /app/frontend/assets/uploads \
    && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

CMD ["sh", "-c", "python -c \"from app import create_app, initialize_database; app = create_app(); initialize_database(app)\" && HBNB_SKIP_APP_DB_INIT=1 exec gunicorn --bind 0.0.0.0:5000 --workers 2 --threads 4 --timeout 60 run:app"]
