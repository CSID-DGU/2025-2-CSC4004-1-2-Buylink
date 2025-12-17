FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV AI_SERVER_PORT=7001

EXPOSE 7001

CMD ["gunicorn", "--bind", "0.0.0.0:7001", "--workers", "2", "--timeout", "120", "api_server_standalone:app"]
