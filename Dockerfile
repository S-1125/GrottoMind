# 使用轻量级的 Python 3.12 官方镜像
FROM python:3.12-slim

# 设置容器内的工作目录
WORKDIR /app

# 将 server 目录下的依赖清单复制进容器
COPY server/requirements.txt .

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 将整个 server 目录的代码复制进容器
COPY server/ .

# 暴露 FastAPI 默认运行的 8000 端口
EXPOSE 8000

# 启动命令：运行 FastAPI 后端
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
