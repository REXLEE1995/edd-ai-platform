## newapi ##
newapi 3000  
xyzpadmin/xyzpadmin@123456

令牌密钥: sk-dpcvzG8pLOR3PI0GcZ24S5cybDpNxPGTipPEXd0ETtw2WgBE

API 端点: http://192.168.110.234:3000/v1

业务模型代号: xyzp-ai (在 New API 渠道中将 xyzp-ai 映射重定向至真实模型，如 deepseek-chat)
newapi已链接数据库、未链接redis

启动脚本：
```bash
# 1. 停止并删除当前运行的容器
docker stop new-api && docker rm new-api

# 2. 重新运行容器，并添加 Redis 连接配置
docker run --name new-api -d --restart always \
  -p 3000:3000 \
  --network new-api-network \
  -e SQL_DSN="xyzp:xyzp123456@tcp(172.26.32.1:3308)/oneapi?charset=utf8mb4&parseTime=True&loc=Local" \
  -e REDIS_CONN_STRING="redis://:redis123456@new-api-redis:6379" \
  -e TZ=Asia/Shanghai \
  -v ./new-api-data:/data \
  --add-host=host.docker.internal:host-gateway \
  calciumion/new-api:latest
```

## mysql ##
mysql 3308

## minio ##
minio 9000


前端服务 5173
后端服务 8000