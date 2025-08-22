# Deployment Guide - Dagupan Legislative Tracking System

This guide provides comprehensive instructions for deploying the Legislative Tracking System in various environments.

## 🚀 Quick Start (Development)

### Prerequisites
- Node.js 18+ 
- PostgreSQL 14+
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd dagupan-legislative-tracking-system
npm run install:all
```

### 2. Database Setup
```bash
# Create PostgreSQL database
createdb dagupan_lts

# Copy environment file
cp backend/.env.example backend/.env

# Edit environment variables
nano backend/.env

# Run migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed
```

### 3. Start Development Servers
```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend  # Backend on port 5000
npm run dev:frontend # Frontend on port 3000
```

## 🐳 Docker Deployment

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+

### 1. Environment Setup
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment variables for production
nano backend/.env
nano frontend/.env
```

### 2. Build and Deploy
```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Production Environment Variables
```bash
# Backend (.env)
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-super-secure-refresh-secret
DB_PASSWORD=your-secure-db-password
FRONTEND_URL=https://your-domain.com

# Frontend (.env)
VITE_API_URL=https://your-domain.com/api
VITE_SOCKET_URL=https://your-domain.com
```

## ☁️ Cloud Deployment

### AWS Deployment

#### 1. EC2 Setup
```bash
# Launch EC2 instance (Ubuntu 22.04 LTS)
# Minimum specs: t3.medium (2 vCPU, 4GB RAM)

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 2. Application Deployment
```bash
# Clone repository
git clone <repository-url>
cd dagupan-legislative-tracking-system

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit production environment variables
nano backend/.env
nano frontend/.env

# Deploy with Docker Compose
docker-compose up -d --build
```

#### 3. Domain and SSL Setup
```bash
# Install Nginx
sudo apt install nginx -y

# Configure Nginx
sudo nano /etc/nginx/sites-available/dagupan-lts

# Enable site
sudo ln -s /etc/nginx/sites-available/dagupan-lts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Install SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

### Azure Deployment

#### 1. Azure Container Instances
```bash
# Create resource group
az group create --name dagupan-lts-rg --location eastus

# Create container registry
az acr create --resource-group dagupan-lts-rg --name dagupanltsacr --sku Basic

# Build and push images
docker build -t dagupanltsacr.azurecr.io/backend ./backend
docker build -t dagupanltsacr.azurecr.io/frontend ./frontend

# Login to registry
az acr login --name dagupanltsacr

# Push images
docker push dagupanltsacr.azurecr.io/backend
docker push dagupanltsacr.azurecr.io/frontend
```

#### 2. Deploy to Azure
```bash
# Deploy backend
az container create \
  --resource-group dagupan-lts-rg \
  --name dagupan-lts-backend \
  --image dagupanltsacr.azurecr.io/backend \
  --dns-name-label dagupan-lts-backend \
  --ports 5000 \
  --environment-variables \
    NODE_ENV=production \
    DB_HOST=your-db-host \
    JWT_SECRET=your-secret

# Deploy frontend
az container create \
  --resource-group dagupan-lts-rg \
  --name dagupan-lts-frontend \
  --image dagupanltsacr.azurecr.io/frontend \
  --dns-name-label dagupan-lts-frontend \
  --ports 80
```

### Google Cloud Platform

#### 1. GKE Deployment
```bash
# Create cluster
gcloud container clusters create dagupan-lts-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium

# Get credentials
gcloud container clusters get-credentials dagupan-lts-cluster --zone us-central1-a

# Deploy with kubectl
kubectl apply -f k8s/
```

## 🏛️ Local Government Server Deployment

### On-Premises Setup

#### 1. Server Requirements
- **Hardware**: 8+ CPU cores, 16GB+ RAM, 500GB+ SSD
- **OS**: Ubuntu 22.04 LTS or CentOS 8
- **Network**: Static IP, firewall access

#### 2. Installation Steps
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Setup PostgreSQL
sudo -u postgres createuser dagupan_lts
sudo -u postgres createdb dagupan_lts
sudo -u postgres psql -c "ALTER USER dagupan_lts PASSWORD 'secure_password';"

# Setup Redis
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### 3. Application Deployment
```bash
# Clone repository
git clone <repository-url> /opt/dagupan-lts
cd /opt/dagupan-lts

# Install dependencies
npm run install:all

# Setup environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit production settings
nano backend/.env
nano frontend/.env

# Build frontend
cd frontend && npm run build

# Setup PM2 ecosystem
pm2 ecosystem

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### 4. Nginx Configuration
```nginx
# /etc/nginx/sites-available/dagupan-lts
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root /opt/dagupan-lts/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## 🔒 Security Configuration

### 1. Firewall Setup
```bash
# UFW (Ubuntu)
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp

# Firewalld (CentOS)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### 2. SSL/TLS Configuration
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Database Security
```bash
# PostgreSQL security
sudo nano /etc/postgresql/14/main/postgresql.conf
# Set: ssl = on

sudo nano /etc/postgresql/14/main/pg_hba.conf
# Restrict connections to localhost and specific IPs
```

## 📊 Monitoring and Maintenance

### 1. Health Checks
```bash
# API health
curl http://localhost:5000/health

# Database connection
sudo -u postgres psql -d dagupan_lts -c "SELECT 1;"

# Frontend availability
curl http://localhost:3000
```

### 2. Log Management
```bash
# View application logs
pm2 logs

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 3. Backup Strategy
```bash
# Database backup script
#!/bin/bash
BACKUP_DIR="/opt/backups/dagupan-lts"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/dagupan_lts_$DATE.sql"

mkdir -p $BACKUP_DIR
sudo -u postgres pg_dump dagupan_lts > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check connection
sudo -u postgres psql -c "\l"

# Verify environment variables
cat backend/.env | grep DB_
```

#### 2. Frontend Build Failed
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### 3. Port Already in Use
```bash
# Check what's using the port
sudo netstat -tulpn | grep :5000
sudo netstat -tulpn | grep :3000

# Kill process if needed
sudo kill -9 <PID>
```

## 📋 Deployment Checklist

- [ ] Environment variables configured
- [ ] Database created and migrations run
- [ ] SSL certificate obtained
- [ ] Firewall configured
- [ ] Monitoring setup
- [ ] Backup strategy implemented
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] User training scheduled
- [ ] Go-live plan prepared

## 🔄 Updates and Maintenance

### 1. Application Updates
```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm run install:all

# Run migrations
npm run db:migrate

# Restart services
pm2 restart all
```

### 2. Database Maintenance
```bash
# Weekly maintenance
sudo -u postgres psql -d dagupan_lts -c "VACUUM ANALYZE;"

# Monthly reindex
sudo -u postgres psql -d dagupan_lts -c "REINDEX DATABASE dagupan_lts;"
```

## 📞 Support and Contact

For deployment support:
- **Technical Issues**: Development Team
- **Infrastructure**: IT Department
- **User Training**: Training Coordinator
- **Emergency**: System Administrator

---

*Last updated: December 2024*
*Version: 1.0.0*