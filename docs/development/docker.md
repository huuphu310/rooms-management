# Docker Deployment Guide

This guide explains how to deploy the Room Booking System using Docker containers.

## 🚀 Quick Start

1. **Configure Environment Variables**
   ```bash
   # The .env.docker file is already configured with working values
   # Update it with your actual credentials if needed
   nano .env.docker
   ```

2. **Deploy the Application**
   ```bash
   # Using the convenience script
   ./docker-run.sh deploy
   
   # Or manually with docker-compose
   docker-compose --env-file .env.docker up --build -d
   ```

3. **Access the Application**
   - **Frontend**: http://localhost:8080
   - **Backend API**: http://localhost:8081
   - **API Documentation**: http://localhost:8081/docs

## 📁 File Structure

```
├── docker-compose.yml       # Multi-service orchestration
├── .env.docker             # Environment variables template
├── .dockerignore           # Files to exclude from builds
├── docker-run.sh           # Deployment convenience script
├── backend/
│   └── Dockerfile          # Backend Python/FastAPI container
├── frontend/
│   ├── Dockerfile          # Frontend React/Nginx container
│   └── nginx.conf          # Nginx configuration
```

## ⚙️ Configuration

### Environment Variables

The `.env.docker` file contains all configuration settings:

```env
# Port Configuration
FRONTEND_PORT=8080          # Frontend access port
BACKEND_PORT=8081           # Backend API port
REDIS_PORT=6379             # Redis cache port

# Supabase (Required)
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Email (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# File Storage (Optional - for image uploads)
R2_ACCOUNT_ID=your_cloudflare_r2_account
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
```

**⚠️ Important**: Update the placeholder values with your actual credentials before deployment.

### Required Services

1. **Supabase Database**: Sign up at [supabase.com](https://supabase.com)
2. **Cloudflare R2** (Optional): For image/file storage
3. **SMTP Service** (Optional): For email notifications

## 🛠️ Management Commands

### Using the Convenience Script

```bash
# Deploy/start all services
./docker-run.sh deploy

# View real-time logs
./docker-run.sh logs

# Stop all services
./docker-run.sh stop

# Clean up everything (containers, volumes, images)
./docker-run.sh clean

# Show help
./docker-run.sh help
```

### Manual Docker Compose Commands

```bash
# Build and start services
docker compose --env-file .env.docker up --build -d

# View logs
docker compose --env-file .env.docker logs -f

# Stop services
docker compose --env-file .env.docker down

# View running containers
docker compose --env-file .env.docker ps

# Restart a specific service
docker compose --env-file .env.docker restart api

# Scale a service (run multiple instances)
docker compose --env-file .env.docker up --scale api=3 -d
```

## 🏗️ Container Architecture

### Frontend Container
- **Base**: Node.js 20 Alpine (build) → Nginx Alpine (runtime)
- **Build**: Multi-stage for optimized production size
- **Features**: React app with Nginx reverse proxy
- **Port**: 80 (internal) → 8080 (external)

### Backend Container  
- **Base**: Python 3.11 Slim
- **Build**: Multi-stage with virtual environment
- **Features**: FastAPI with health checks
- **Port**: 8000 (internal) → 8081 (external)

### Redis Container
- **Base**: Redis 7 Alpine
- **Features**: Persistent storage with AOF
- **Port**: 6379

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
lsof -i :8080
lsof -i :8081

# Change ports in .env.docker
FRONTEND_PORT=8090
BACKEND_PORT=8091
```

**2. Build Failures**
```bash
# Clean Docker cache and rebuild
docker system prune -a
./docker-run.sh clean
./docker-run.sh deploy
```

**3. Environment Variables Not Loading**
```bash
# Verify environment file exists and has correct format
cat .env.docker

# Check for syntax errors (no spaces around =)
grep -n "=" .env.docker
```

**4. Service Health Check Failures**
```bash
# Check service logs
docker-compose --env-file .env.docker logs api

# Check if health endpoints are responding
curl http://localhost:8081/health
```

### Debugging Commands

```bash
# Enter a running container
docker-compose --env-file .env.docker exec api bash
docker-compose --env-file .env.docker exec frontend sh

# Check container resource usage
docker stats

# View detailed container information
docker-compose --env-file .env.docker config

# Check network connectivity between containers
docker-compose --env-file .env.docker exec frontend ping api
```

## 📊 Monitoring

### Health Checks
- **Backend**: `GET /health` (every 30s)
- **Redis**: `redis-cli ping` (every 30s)
- **Frontend**: HTTP status check (every 30s)

### Log Management
```bash
# View logs by service
docker-compose --env-file .env.docker logs api
docker-compose --env-file .env.docker logs frontend
docker-compose --env-file .env.docker logs redis

# Follow logs in real-time
docker-compose --env-file .env.docker logs -f --tail=100

# Export logs to file
docker-compose --env-file .env.docker logs > deployment.log 2>&1
```

## 🚀 Production Considerations

### Security
- [ ] Change all default passwords and secret keys
- [ ] Use Docker secrets for sensitive data
- [ ] Enable firewall rules for container ports
- [ ] Use SSL/TLS certificates (add reverse proxy)

### Performance
- [ ] Increase container resource limits for production
- [ ] Configure Redis memory limits
- [ ] Enable log rotation
- [ ] Set up monitoring and alerting

### Backup
- [ ] Backup Redis data volume regularly
- [ ] Export application configuration
- [ ] Document recovery procedures

## 🆘 Support

If you encounter issues:

1. Check the logs: `./docker-run.sh logs`
2. Verify environment configuration
3. Review this documentation
4. Check Docker and Docker Compose versions
5. Ensure all required services (Supabase, etc.) are accessible

---

**Happy Deploying! 🎉**