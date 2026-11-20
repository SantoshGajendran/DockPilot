FROM python:3.12-slim
WORKDIR /app
RUN useradd -m -u 1001 dockpilot
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN chmod +x /app/entrypoint.sh && chown -R dockpilot:dockpilot /app
USER dockpilot
EXPOSE 8000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
