# 🚀 Infraestrutura AWS - Analytics Platform

## 📋 Visão Geral

**Arquitetura:** Custo-Otimizada com Alta Performance  
**Custo Mensal:** ~$31/mês  
**Disponibilidade:** 99.5% (downtime: 3-5min/mês em manutenções programadas)  
**Capacidade:** 300-1.000 vendas/dia (escalável até 10.000+)

---

## 🏗️ Componentes da Infraestrutura

### 1. Compute - ECS Fargate (Graviton2)

```yaml
Service: analytics-platform-api
Task Definition:
  Family: analytics-api
  CPU: 256 (0.25 vCPU)
  Memory: 512 MB
  Platform: LINUX/ARM64 (Graviton2)
  
  Container:
    Name: nestjs-api
    Image: <AWS_ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com/analytics-api:latest
    Port: 4000
    Environment:
      - NODE_ENV=production
      - DATABASE_URL=<from_secrets_manager>
      - REDIS_HOST=<ecs_redis_service>
      - JWT_SECRET=<from_secrets_manager>
      - ENCRYPTION_KEY=<from_secrets_manager>
    
  Redis Container (sidecar):
    Name: redis
    Image: redis:7-alpine
    Port: 6379
    Memory: 128 MB
    Volume: /data (EFS)

Auto Scaling:
  Min tasks: 1
  Max tasks: 6
  Target CPU: 65%
  Target Memory: 75%
  Scale-out cooldown: 60s
  Scale-in cooldown: 300s

Deployment:
  Type: Rolling Update
  Min healthy percent: 0
  Max percent: 200
  Health check grace period: 30s

Health Check:
  Path: /health
  Interval: 30s
  Timeout: 5s
  Healthy threshold: 2
  Unhealthy threshold: 3
```

**Custo:** ~$8/mês (1 task 24/7)

---

### 2. Database - RDS PostgreSQL (Single-AZ)

```yaml
Instance:
  Class: db.t4g.micro (Graviton2)
  Engine: PostgreSQL 16
  vCPU: 2
  RAM: 1 GB
  
Storage:
  Type: GP3 (SSD)
  Size: 20 GB
  IOPS: 3000 (baseline)
  Throughput: 125 MB/s
  Auto-scaling: Disabled (enable at 80% usage)

Availability:
  Multi-AZ: No (Single-AZ para economia)
  Backup retention: 7 days
  Point-in-time recovery: 7 days
  Maintenance window: Sun 04:00-05:00 UTC

Security:
  Encryption at rest: Yes (AWS KMS)
  Encryption in transit: Yes (SSL/TLS)
  Public access: No
  VPC: Private subnet only

Performance Insights:
  Enabled: Yes (7 days retention - free)
  
Monitoring:
  Enhanced monitoring: No (custo adicional)
  CloudWatch metrics: Yes (free)
```

**Custo:** ~$16/mês

---

### 3. Cache - Redis no ECS (Container)

```yaml
Container:
  Image: redis:7-alpine
  Memory: 128 MB
  CPU: 50 units (shared)
  
Configuration:
  Persistence: Yes (RDB + AOF)
  Max memory: 100mb
  Max memory policy: allkeys-lru
  
Storage:
  Type: EFS (Elastic File System)
  Size: 1 GB
  Performance mode: General Purpose
  Throughput mode: Bursting
  Lifecycle policy: 30 days to IA
  
Mount:
  Container path: /data
  EFS path: /redis-data
  
Backup:
  Daily snapshot to S3 (via cron job)
  Retention: 7 days
```

**Custo:** ~$3/mês (EFS 1GB)

---

### 4. Networking & Load Balancer

```yaml
CloudFlare Tunnel (FREE):
  Purpose: SSL termination + DDoS protection
  Features:
    - Free SSL certificate
    - DDoS protection included
    - CDN caching for static assets
    - Zero-trust access
  
  Configuration:
    - Tunnel connects to ECS task IP:4000
    - Domain: api.yourdomain.com
    - SSL Mode: Full (strict)

VPC Configuration:
  CIDR: 10.0.0.0/16
  
  Availability Zones: 2
    - us-east-1a
    - us-east-1b (preparado, usando 1 inicialmente)
  
  Subnets:
    Public (10.0.1.0/24):
      - ECS tasks (protected by CloudFlare)
    
    Private (10.0.2.0/24):
      - RDS PostgreSQL
      - EFS mount points
  
  Internet Gateway: Yes
  NAT Gateway: No (economia de $32/mês)

Security Groups:
  sg-ecs-tasks:
    Inbound:
      - Port 4000 from CloudFlare IPs only
    Outbound: 
      - All traffic (0.0.0.0/0)
  
  sg-rds:
    Inbound:
      - Port 5432 from sg-ecs-tasks only
    Outbound:
      - None
  
  sg-efs:
    Inbound:
      - Port 2049 from sg-ecs-tasks only
    Outbound:
      - None

Route 53:
  Hosted Zone: yourdomain.com ($0.50/mês)
  Records:
    - api.yourdomain.com → CloudFlare Tunnel
    - dashboard.yourdomain.com → Vercel
```

**Custo:** ~$0.50/mês (Route 53)

---

### 5. Storage & Backups

```yaml
S3 Buckets:
  analytics-backups:
    Storage class: Standard
    Size: ~5 GB
    Purpose: 
      - Database backups (pg_dump)
      - Redis snapshots
      - Application logs archives
    
    Lifecycle:
      - Delete after 14 days
    
    Versioning: Disabled
    Encryption: AES-256 (SSE-S3)
  
  analytics-logs:
    Storage class: Standard
    Size: ~2 GB
    Purpose: CloudWatch Logs export
    Lifecycle: Delete after 7 days

ECR (Elastic Container Registry):
  Repository: analytics-api
  Image count: Keep last 10 images
  Size: ~5 GB
  Scan on push: Yes (basic scanning)
```

**Custo:** ~$0.62/mês

---

### 6. Monitoring & Observability

```yaml
CloudWatch:
  Logs:
    - /ecs/analytics-api (retention: 7 days)
    - /rds/postgresql (retention: 7 days)
    Size: ~2 GB/month
  
  Metrics (Custom):
    - ECS Task Count
    - API Response Time (p50, p95, p99)
    - Webhook Processing Time
    - BullMQ Queue Size
    - Database Connections
  
  Dashboards:
    - System Overview (CPU, Memory, Disk)
    - API Performance (Latency, Errors)
    - Business Metrics (MRR, Churn, etc)
  
  Alarms (Critical):
    1. ECS-HighCPU (CPU > 80% for 5min) → Email
    2. ECS-TaskCrash (task unhealthy) → Email
    3. RDS-HighCPU (CPU > 85% for 5min) → Email
    4. RDS-LowStorage (< 2GB free) → Email
    5. API-HighErrors (5xx > 10/min) → Email
    6. Webhook-QueueBacklog (> 100 jobs) → Email

SNS Topics:
  - critical-alerts → Email/SMS
  - warning-alerts → Email only

Sentry (Self-hosted):
  Deployment: ECS task (separate service)
  Storage: EFS 5GB
  Database: Same RDS (separate schema)
  Purpose: Error tracking & performance monitoring
  Cost: +$1/mês (EFS adicional)
```

**Custo:** ~$3/mês

---

### 7. Frontend - Vercel

```yaml
Plan: Hobby (FREE)
Project: analytics-dashboard

Configuration:
  Framework: Next.js 14
  Build Command: npm run build
  Output Directory: .next
  Install Command: npm install
  Node Version: 22.x

Environment Variables:
  - NEXT_PUBLIC_API_URL=https://api.yourdomain.com
  - NEXT_PUBLIC_SENTRY_DSN=<sentry_url>

Features:
  - Automatic deployments from Git
  - Preview deployments (PRs)
  - SSL certificate (auto)
  - Edge Network (CDN)
  - Image Optimization
  - Analytics: No (Pro feature)

Limits:
  - 100 GB bandwidth/month
  - 6000 build minutes/month
  - Unlimited requests
```

**Custo:** $0/mês

---

### 8. CI/CD Pipeline

```yaml
GitHub Actions:
  Workflows:
    1. CI - Pull Request:
       Trigger: Pull request
       Steps:
         - Lint (ESLint)
         - Type check (TypeScript)
         - Unit tests (Jest)
         - Build test
       
    2. CD - Deploy to Production:
       Trigger: Push to main branch
       Steps:
         - Run tests
         - Build Docker image
         - Push to ECR
         - Update ECS task definition
         - Deploy new ECS service revision
         - Run smoke tests
         - Notify Slack
       
  Secrets (GitHub):
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY
    - AWS_REGION
    - ECR_REPOSITORY
    - ECS_CLUSTER
    - ECS_SERVICE
    - SLACK_WEBHOOK_URL

ECR:
  Repository: analytics-api
  Image tagging:
    - latest (production)
    - git-sha (versioning)
    - pr-<number> (preview)
  
  Lifecycle policy:
    - Keep last 10 tagged images
    - Delete untagged after 1 day
```

**Custo:** $0/mês (GitHub Actions free tier)

---

## 💰 Resumo de Custos Mensais

| Componente | Especificação | Custo |
|------------|---------------|-------|
| ECS Fargate | 1 task (0.25vCPU, 0.5GB) | $8.00 |
| RDS PostgreSQL | db.t4g.micro Single-AZ | $16.00 |
| EFS (Redis) | 1 GB storage | $3.00 |
| Route 53 | Hosted zone | $0.50 |
| S3 + ECR | Backups + Images | $0.62 |
| CloudWatch | Logs + Metrics + Alarms | $3.00 |
| CloudFlare | Tunnel + SSL + DDoS | $0.00 |
| Vercel | Frontend hosting | $0.00 |
| **TOTAL** | | **$31.12/mês** |

---

## 📈 Plano de Escalabilidade

### Fase 1: 200-500 vendas/dia (Atual - $31/mês)
```
Status: ✅ Configuração atual suficiente
CPU: < 15%
Memory: < 40%
Database: < 20% connections
```

### Fase 2: 500-1.500 vendas/dia ($48/mês)
```diff
+ ECS: 1 task → 2 tasks permanentes (+$8/mês)
+ Redis: ECS container → ElastiCache t4g.micro (+$12/mês)
+ Remover: Redis EFS (-$3/mês)
Custo: $48/mês
```

### Fase 3: 1.500-3.000 vendas/dia ($110/mês)
```diff
+ Load Balancer: CloudFlare → ALB (+$17/mês)
+ RDS: Single-AZ → Multi-AZ (+$13/mês)
+ NAT Gateway: Adicionar (+$32/mês)
Custo: $110/mês
```

### Fase 4: 3.000-10.000 vendas/dia ($170/mês)
```diff
+ RDS: db.t4g.micro → db.t4g.small (+$29/mês)
+ Redis: t4g.micro → t4g.small com replica (+$31/mês)
Custo: $170/mês
```

---

## 🔒 Segurança

### Credenciais e Secrets
```yaml
AWS Secrets Manager:
  Secrets:
    - /analytics/production/database-url
    - /analytics/production/jwt-secret
    - /analytics/production/jwt-refresh-secret
    - /analytics/production/encryption-key
    - /analytics/production/stripe-api-key
    - /analytics/production/stripe-webhook-secret
    - /analytics/production/hotmart-api-key
    - /analytics/production/cartpanda-api-key
  
  Rotation: Manual (implementar automático quando necessário)
  Cost: $0.40/secret/mês = ~$3.20/mês
```

### Encryption
```yaml
At Rest:
  - RDS: AWS KMS encryption
  - EFS: AWS KMS encryption
  - S3: SSE-S3 encryption
  - ECR: AES-256 encryption

In Transit:
  - API: TLS 1.3 (CloudFlare)
  - RDS: SSL/TLS required
  - Redis: No SSL (same VPC, private)
```

### Access Control
```yaml
IAM Roles:
  - ECS Task Execution Role (pull ECR, read Secrets Manager)
  - ECS Task Role (access S3, RDS, CloudWatch)
  - GitHub Actions Deploy Role (push ECR, update ECS)

Security Groups:
  - Least privilege (apenas portas necessárias)
  - Inbound rules restritas por source
  - Outbound apenas quando necessário
```

### Compliance
```yaml
Audit:
  - CloudTrail: All API calls logged (30 days)
  - VPC Flow Logs: Optional (+$5/mês se necessário)
  - Application logs: 7 days retention

Backups:
  - RDS: Automático diário (7 dias)
  - Redis: Snapshot manual diário (7 dias)
  - Point-in-time recovery: 7 dias
```

---

## 🚨 Disaster Recovery

### RTO (Recovery Time Objective)
```
Cenário 1: ECS task crash
  - Auto restart: 30-60 segundos
  - Zero intervenção manual

Cenário 2: RDS maintenance/reboot
  - Downtime: 5-10 minutos
  - Agendado: Madrugada de domingo
  - Notificação: 7 dias antecedência

Cenário 3: Redis crash
  - Container restart: 10-30 segundos
  - Cache rebuild: 2-5 minutos
  - Impacto: Performance degradada temporária

Cenário 4: Zona de disponibilidade down
  - Sem redundância (Single-AZ)
  - Requer intervenção manual
  - Migração para nova AZ: 30-60 minutos
```

### RPO (Recovery Point Objective)
```
Database:
  - Backup diário automático
  - Point-in-time recovery: 5 minutos
  - RPO: Máximo 5 minutos de dados perdidos

Redis:
  - Snapshot diário
  - Dados de cache (não críticos)
  - RPO: 24 horas (aceitável para cache)

Application state:
  - Stateless (sem perda)
  - RPO: 0
```

### Backup Strategy
```bash
# Backup automático RDS (configurado)
# - Executado diariamente às 03:00 UTC
# - Retenção: 7 dias

# Backup manual Redis (script)
#!/bin/bash
# /opt/scripts/backup-redis.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
docker exec redis redis-cli BGSAVE
sleep 60
aws s3 cp /mnt/efs/redis-data/dump.rdb \
  s3://analytics-backups/redis/dump-${TIMESTAMP}.rdb
aws s3 rm --recursive s3://analytics-backups/redis/ \
  --exclude "*" --include "*" \
  --older-than 7d

# Cron job (adicionar ao ECS task)
0 3 * * * /opt/scripts/backup-redis.sh
```

---

## 📊 Monitoring & Alertas

### Métricas Críticas
```yaml
System Metrics:
  - ECS CPU Utilization (target: < 65%)
  - ECS Memory Utilization (target: < 75%)
  - RDS CPU Utilization (target: < 70%)
  - RDS Free Storage Space (target: > 2GB)
  - RDS Database Connections (target: < 80)

Application Metrics:
  - API Response Time p95 (target: < 300ms)
  - API Error Rate (target: < 1%)
  - Webhook Processing Time p95 (target: < 2s)
  - BullMQ Queue Backlog (target: < 50)

Business Metrics:
  - Webhooks received per minute
  - Subscriptions created per day
  - Failed webhook processing rate
```

### Alarmes Configurados
```yaml
Critical (SNS → Email + SMS):
  1. ECS-AllTasksDown: All tasks unhealthy > 2min
  2. RDS-Down: Database not responding > 1min
  3. API-HighErrorRate: 5xx errors > 5% for 5min
  4. Webhook-ProcessingFailure: Failed jobs > 20% for 10min

Warning (SNS → Email):
  1. ECS-HighCPU: CPU > 80% for 5min
  2. RDS-HighCPU: CPU > 85% for 5min
  3. RDS-LowStorage: Free space < 2GB
  4. API-SlowResponse: p95 > 500ms for 10min
  5. BullMQ-Backlog: Queue size > 100 for 15min
```

### Dashboard CloudWatch
```yaml
Dashboard: Analytics-Platform-Overview

Widgets:
  Row 1 - System Health:
    - ECS Task Count (line chart)
    - ECS CPU/Memory (line chart)
    - RDS CPU/Connections (line chart)
  
  Row 2 - API Performance:
    - API Requests per minute (line chart)
    - API Response time p50/p95/p99 (line chart)
    - API Error rate 4xx/5xx (line chart)
  
  Row 3 - Background Jobs:
    - Webhook queue size (line chart)
    - Webhook processing time (line chart)
    - Failed jobs count (number)
  
  Row 4 - Business Metrics:
    - Webhooks received (number)
    - Subscriptions created (number)
    - MRR calculation jobs (number)

Refresh: Auto (1 minute)
Period: Last 3 hours
```

---

## 🛠️ Operational Runbooks

### Deploy Manual (Emergency)
```bash
# 1. Build and push image
docker build -t analytics-api:emergency .
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag analytics-api:emergency <account>.dkr.ecr.us-east-1.amazonaws.com/analytics-api:emergency
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/analytics-api:emergency

# 2. Update ECS task definition
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json

# 3. Update service
aws ecs update-service \
  --cluster analytics-production \
  --service analytics-api \
  --task-definition analytics-api:latest \
  --force-new-deployment
```

### Rollback Deployment
```bash
# 1. List recent task definitions
aws ecs list-task-definitions \
  --family-prefix analytics-api \
  --sort DESC \
  --max-items 5

# 2. Rollback to previous version
aws ecs update-service \
  --cluster analytics-production \
  --service analytics-api \
  --task-definition analytics-api:<previous-revision>
```

### Scale ECS Tasks Manually
```bash
# Scale up
aws ecs update-service \
  --cluster analytics-production \
  --service analytics-api \
  --desired-count 3

# Scale down
aws ecs update-service \
  --cluster analytics-production \
  --service analytics-api \
  --desired-count 1
```

### Database Maintenance
```bash
# Connect to RDS
psql -h <rds-endpoint> -U postgres -d analytics

# Check database size
SELECT pg_size_pretty(pg_database_size('analytics'));

# Check table sizes
SELECT schemaname, tablename, 
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) 
FROM pg_tables 
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;

# Vacuum analyze (performance)
VACUUM ANALYZE;

# Manual backup
pg_dump -h <rds-endpoint> -U postgres analytics > backup.sql
aws s3 cp backup.sql s3://analytics-backups/manual/backup-$(date +%Y%m%d).sql
```

### Redis Maintenance
```bash
# Connect to Redis
docker exec -it <container-id> redis-cli

# Check memory usage
INFO memory

# Check connected clients
CLIENT LIST

# Flush all (CUIDADO!)
FLUSHALL

# Manual backup
BGSAVE
```

---

## 📝 Checklist de Deploy Inicial

### Pré-requisitos
- [ ] Conta AWS criada e configurada
- [ ] AWS CLI instalado e configurado
- [ ] Domínio registrado (Route 53 ou externo)
- [ ] CloudFlare account criado
- [ ] GitHub repository configurado
- [ ] Vercel account conectado ao GitHub

### Infraestrutura Base
- [ ] VPC criada (10.0.0.0/16)
- [ ] Subnets criadas (public + private)
- [ ] Internet Gateway criado e associado
- [ ] Route tables configuradas
- [ ] Security Groups criados

### Database
- [ ] RDS PostgreSQL criado (db.t4g.micro)
- [ ] Secrets Manager: database credentials
- [ ] Security group configurado
- [ ] Backup automático habilitado (7 dias)
- [ ] Performance Insights habilitado

### EFS (Redis Storage)
- [ ] EFS criado (General Purpose)
- [ ] Mount targets nas subnets privadas
- [ ] Security group configurado

### ECS Cluster
- [ ] ECS Cluster criado
- [ ] Task definition criada (NestJS + Redis)
- [ ] ECS Service criado
- [ ] Auto-scaling configurado (1-6 tasks)
- [ ] CloudWatch Logs configurado

### ECR
- [ ] ECR repository criado
- [ ] Lifecycle policy configurada
- [ ] Image scanning habilitado

### CloudFlare
- [ ] Tunnel criado
- [ ] Domínio apontado para tunnel
- [ ] SSL/TLS configurado (Full strict)
- [ ] Tunnel conectado ao ECS

### Monitoring
- [ ] CloudWatch Dashboard criado
- [ ] Alarmes configurados
- [ ] SNS topic criado
- [ ] Email subscriptions confirmadas

### CI/CD
- [ ] GitHub Actions workflows criados
- [ ] GitHub Secrets configurados
- [ ] Primeiro deploy testado

### Vercel
- [ ] Projeto Next.js conectado
- [ ] Environment variables configuradas
- [ ] Domain configurado (dashboard.yourdomain.com)

### Final
- [ ] Smoke tests executados
- [ ] Documentação revisada
- [ ] Runbooks testados
- [ ] Equipe treinada
- [ ] Go-live! 🚀

---

## 🎯 Próximos Passos

1. **Provisionar infraestrutura** (Terraform ou manual)
2. **Configurar CI/CD** (GitHub Actions)
3. **Deploy inicial** (versão 1.0)
4. **Testes de carga** (validar limites)
5. **Monitoramento ativo** (primeira semana crítica)
6. **Documentar incidentes** (learning)

---

## 📞 Contatos e Suporte

**Documentação:**
- Este arquivo: `infrastructure-setup.md`
- Runbooks: `docs/runbooks/`
- Architecture diagrams: `docs/diagrams/`

**Monitoramento:**
- CloudWatch Dashboard: [Link]
- Sentry: [Link]
- Status page: [Link]

**Suporte AWS:**
- Basic support (incluído)
- Developer support: $29/mês (opcional)
- Business support: $100/mês (quando crítico)

---

**Última atualização:** 2025-01-XX
**Versão:** 1.0
**Aprovado por:** [Seu nome]
