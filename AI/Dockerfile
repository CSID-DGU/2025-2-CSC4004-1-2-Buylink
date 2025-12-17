FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV AI_PORT=7001

EXPOSE 7001

CMD ["python", "api_server_standalone.py"]
