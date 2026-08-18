# 使用轻量级的 Python 3.12 官方镜像
FROM python:3.12-slim

# 设置容器内的工作目录
WORKDIR /app

# 将 server 目录下的依赖清单复制进容器并安装
COPY server/requirements.txt ./server/
RUN pip install --no-cache-dir -r ./server/requirements.txt

# 将整个 server 目录的代码复制进容器
COPY server/ ./server/

# Render / Zeabur 会注入 PORT 环境变量，默认 8080
ENV PORT=8080
EXPOSE 8080

# 启动命令：使用 shell 形式以读取 $PORT 环境变量
CMD uvicorn server.main:app --host 0.0.0.0 --port $PORT
