# 🚀 Deploy Guide - Analytics Platform AWS

## 📋 Pré-requisitos

### 1. Ferramentas Necessárias
- AWS CLI instalado e configurado
- Terraform >= 1.5
- Docker Desktop
- Node.js 22.x
- Git

### 2. Contas e Acessos
- Conta AWS com permissões de administrador
- Domínio registrado (Route 53 ou externo)
- Conta CloudFlare (gratuita)
- Conta Vercel (gratuita)
- Conta GitHub

---

## 🎯 Passo a Passo - Deploy Completo

### FASE 1: Configuração Inicial

#### 1.1. Clonar o Repositório
```bash
git clone <your-repo-url>
cd analytics-platform
```

#### 1.2. Gerar Secrets
```bash
# Database password (salve em local seguro)
openssl rand -base64 32

# JWT Secret
openssl rand -base64 64

# Encryption Key (64 caracteres hex)
openssl rand -hex 32
```

#### 1.3. Configurar AWS CLI
```bash
aws configure
# AWS Access Key ID: [seu access key]
# AWS Secret Access Key: [seu secret key]
# Default region name: us-east-1
# Default output format: json
```

---

### FASE 2: Provisionar Infraestrutura com Terraform

#### 2.1. Preparar Terraform
```bash
cd terraform

# Copiar arquivo de variáveis
cp terraform.tfvars.example terraform.tfvars

# Editar terraform.tfvars com seus valores
nano terraform.tfvars
```

**Preencha terraform.tfvars:**
```hcl
aws_region         = "us-east-1"
environment        = "production"
project_name       = "analytics-platform"
domain_name        = "seudominio.com"
db_master_password = "SENHA_GERADA_ANTERIORMENTE"
jwt_secret         = "JWT_SECRET_GERADO"
encryption_key     = "ENCRYPTION_KEY_64_HEX"
```

#### 2.2. Executar Terraform
```bash
# Inicializar Terraform
terraform init

# Verificar plano de execução
terraform plan

# REVISAR CUIDADOSAMENTE o output
# Confirmar custos e recursos

# Aplicar (vai criar TODA a infraestrutura)
terraform apply

# Confirmar com: yes

# ⏱️ Tempo estimado: 10-15 minutos
```

#### 2.3. Salvar Outputs
```bash
# Salvar outputs importantes
terraform output > ../terraform-outputs.txt

# Outputs importantes:
# - ecr_repository_url
# - ecs_cluster_name
# - ecs_service_name
# - rds_endpoint
```

---

### FASE 3: Setup do Database

#### 3.1. Executar Migrations
```bash
# Conectar ao RDS (pegue endpoint do terraform output)
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)

# Ou conectar via bastion/port forward
# Por enquanto, vamos usar connection local
# (Configure security group temporariamente para permitir seu IP)

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:SENHA@$RDS_ENDPOINT/analytics"

# Executar migrations
npx prisma migrate deploy

# Executar seed (opcional, dados de teste)
npx prisma db seed
```

---

### FASE 4: Build e Push da Imagem Docker

#### 4.1. Build da Imagem
```bash
# Login no ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-east-1.amazonaws.com

# Get ECR URL
ECR_URL=$(cd terraform && terraform output -raw ecr_repository_url)

# Build para ARM64 (Graviton2)
docker buildx build --platform linux/arm64 \
  -t $ECR_URL:latest \
  -t $ECR_URL:v1.0.0 \
  --build-arg NODE_ENV=production \
  .

# Push para ECR
docker push $ECR_URL:latest
docker push $ECR_URL:v1.0.0
```

#### 4.2. Verificar Imagem
```bash
# Listar imagens no ECR
aws ecr list-images \
  --repository-name analytics-platform-production-api \
  --region us-east-1
```

---

### FASE 5: Deploy ECS Service

#### 5.1. Atualizar Task Definition (já foi criada pelo Terraform)
```bash
# Force new deployment
ECS_CLUSTER=$(cd terraform && terraform output -raw ecs_cluster_name)
ECS_SERVICE=$(cd terraform && terraform output -raw ecs_service_name)

aws ecs update-service \
  --cluster $ECS_CLUSTER \
  --service $ECS_SERVICE \
  --force-new-deployment \
  --region us-east-1
```

#### 5.2. Monitorar Deploy
```bash
# Watch service status
aws ecs describe-services \
  --cluster $ECS_CLUSTER \
  --services $ECS_SERVICE \
  --region us-east-1 \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount}'

# Watch task logs
aws logs tail /ecs/analytics-platform-production --follow
```

#### 5.3. Verificar Health
```bash
# Get task public IP
TASK_ARN=$(aws ecs list-tasks \
  --cluster $ECS_CLUSTER \
  --service-name $ECS_SERVICE \
  --query 'taskArns[0]' \
  --output text \
  --region us-east-1)

ENI_ID=$(aws ecs describe-tasks \
  --cluster $ECS_CLUSTER \
  --tasks $TASK_ARN \
  --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
  --output text \
  --region us-east-1)

PUBLIC_IP=$(aws ec2 describe-network-interfaces \
  --network-interface-ids $ENI_ID \
  --query 'NetworkInterfaces[0].Association.PublicIp' \
  --output text \
  --region us-east-1)

echo "Task running at: http://$PUBLIC_IP:4000"

# Test health endpoint
curl http://$PUBLIC_IP:4000/health
```

---

### FASE 6: Configurar CloudFlare Tunnel

#### 6.1. Instalar CloudFlare Tunnel
```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Windows
# Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

#### 6.2. Login no CloudFlare
```bash
cloudflared login
# Abrirá browser para autenticar
```

#### 6.3. Criar Tunnel
```bash
# Criar tunnel
cloudflared tunnel create analytics-production

# Vai retornar um UUID - SALVE ESSE UUID!
# Example: a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

#### 6.4. Configurar Tunnel
```bash
# Criar config file
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

**Conteúdo do config.yml:**
```yaml
tunnel: <TUNNEL_UUID>
credentials-file: /Users/youruser/.cloudflared/<TUNNEL_UUID>.json

ingress:
  - hostname: api.seudominio.com
    service: http://<ECS_TASK_PUBLIC_IP>:4000
  - service: http_status:404
```

#### 6.5. Criar DNS Record
```bash
# Criar CNAME record
cloudflared tunnel route dns <TUNNEL_UUID> api.seudominio.com
```

#### 6.6. Iniciar Tunnel
```bash
# Test local
cloudflared tunnel run analytics-production

# Se funcionar, instalar como service
cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

#### 6.7. Verificar
```bash
# Test via CloudFlare
curl https://api.seudominio.com/health
```

---

### FASE 7: Deploy Frontend (Vercel)

#### 7.1. Preparar Repositório Frontend
```bash
# Assumindo que frontend está em ./dashboard
cd dashboard

# Criar vercel.json
cat > vercel.json << EOF
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "outputDirectory": ".next"
}
EOF
```

#### 7.2. Deploy via Vercel CLI
```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Siga as instruções:
# - Link to existing project? No
# - Project name: analytics-dashboard
# - Directory: ./
# - Override settings? No
```

#### 7.3. Configurar Environment Variables no Vercel
```bash
# Via CLI
vercel env add NEXT_PUBLIC_API_URL production
# Value: https://api.seudominio.com

# Ou via dashboard: https://vercel.com/your-team/analytics-dashboard/settings/environment-variables
```

#### 7.4. Configurar Domínio Customizado
```bash
# Via CLI
vercel domains add dashboard.seudominio.com

# Ou via dashboard e adicionar DNS records:
# CNAME dashboard.seudominio.com -> cname.vercel-dns.com
```

---

### FASE 8: Configurar CI/CD (GitHub Actions)

#### 8.1. Criar Secrets no GitHub
```bash
# Via GitHub UI:
# Settings > Secrets and variables > Actions > New repository secret

# Adicionar:
# - AWS_ACCESS_KEY_ID
# - AWS_SECRET_ACCESS_KEY
# - AWS_REGION (us-east-1)
```

#### 8.2. Copiar Workflow
```bash
# Já criamos o arquivo .github/workflows/deploy.yml
# Commit e push

git add .github/workflows/deploy.yml
git commit -m "feat: add CI/CD pipeline"
git push origin main

# GitHub Actions vai executar automaticamente
```

#### 8.3. Monitorar Deploy
```bash
# Via GitHub UI:
# Actions tab > Deploy to Production

# Ou via CLI (gh CLI tool):
gh run list
gh run view <RUN_ID> --log
```

---

### FASE 9: Configurar Monitoramento

#### 9.1. Confirmar SNS Subscription
```bash
# Você receberá email de confirmação
# Clique no link para confirmar

# Ou via CLI:
aws sns list-subscriptions --region us-east-1
```

#### 9.2. Criar CloudWatch Dashboard
```bash
# Já foi criado pelo Terraform
# Acesse: AWS Console > CloudWatch > Dashboards

# Ou via CLI:
aws cloudwatch get-dashboard \
  --dashboard-name analytics-platform-production \
  --region us-east-1
```

#### 9.3. Testar Alarmes
```bash
# Simular alta CPU
# (não recomendado em produção, apenas para validar)

# Melhor: verificar configuração
aws cloudwatch describe-alarms --region us-east-1
```

---

### FASE 10: Setup Sentry (Opcional)

#### 10.1. Deploy Sentry Self-Hosted
```bash
# Clone Sentry repo
git clone https://github.com/getsentry/self-hosted.git
cd self-hosted

# Install
./install.sh

# Configure (adicionar ao docker-compose.yml para usar RDS)
# Ou usar ECS task separado
```

**Alternativa: Usar Sentry Cloud**
```bash
# Criar conta em: https://sentry.io
# Free tier: 5k events/month

# Adicionar DSN às variáveis de ambiente
# Frontend (Vercel):
vercel env add NEXT_PUBLIC_SENTRY_DSN production

# Backend (ECS via Secrets Manager):
aws secretsmanager create-secret \
  --name analytics-platform-production/sentry-dsn \
  --secret-string "https://xxx@xxx.ingest.sentry.io/xxx" \
  --region us-east-1
```

---

## ✅ Checklist Final

### Pré-Deploy
- [ ] Secrets gerados e salvos com segurança
- [ ] Domínio registrado e DNS configurável
- [ ] Contas criadas (AWS, CloudFlare, Vercel, GitHub)
- [ ] AWS CLI configurado
- [ ] Terraform instalado

### Infraestrutura
- [ ] Terraform apply executado com sucesso
- [ ] VPC e subnets criados
- [ ] RDS PostgreSQL rodando
- [ ] EFS criado para Redis
- [ ] ECS Cluster criado
- [ ] ECR repository criado
- [ ] Security Groups configurados

### Application
- [ ] Database migrations executadas
- [ ] Docker image built e pushed para ECR
- [ ] ECS Service rodando (1 task healthy)
- [ ] Health endpoint respondendo
- [ ] CloudFlare Tunnel conectado
- [ ] HTTPS funcionando (api.seudominio.com)

### Frontend
- [ ] Vercel deploy successful
- [ ] Environment variables configuradas
- [ ] Custom domain configurado
- [ ] HTTPS funcionando (dashboard.seudominio.com)

### CI/CD
- [ ] GitHub secrets configurados
- [ ] Workflow rodando sem erros
- [ ] Deploy automático funcionando

### Monitoring
- [ ] SNS topic subscription confirmada
- [ ] CloudWatch alarms ativos
- [ ] CloudWatch Dashboard criado
- [ ] Logs sendo coletados

### Security
- [ ] Secrets Manager populado
- [ ] Security Groups restritivos
- [ ] IAM roles com least privilege
- [ ] Encryption at-rest habilitado
- [ ] SSL/TLS end-to-end

---

## 🎯 Próximos Passos Pós-Deploy

### Semana 1
- [ ] Monitorar logs diariamente
- [ ] Validar métricas de performance
- [ ] Testar auto-scaling (simular carga)
- [ ] Documentar incidentes
- [ ] Ajustar alarmes se necessário

### Semana 2-4
- [ ] Configurar backups regulares
- [ ] Implementar runbooks operacionais
- [ ] Treinar equipe em procedimentos
- [ ] Otimizar queries lentas
- [ ] Revisar custos AWS

### Mês 2-3
- [ ] Avaliar necessidade de Multi-AZ
- [ ] Considerar CDN para static assets
- [ ] Implementar feature flags
- [ ] Adicionar testes E2E
- [ ] Planejar disaster recovery drills

---

## 🆘 Troubleshooting

### ECS Task não inicia
```bash
# Check task logs
aws logs tail /ecs/analytics-platform-production --follow

# Check task stopped reason
aws ecs describe-tasks \
  --cluster $ECS_CLUSTER \
  --tasks $TASK_ARN \
  --query 'tasks[0].stoppedReason'

# Common issues:
# - Image pull failed → Check ECR permissions
# - Health check failed → Check /health endpoint
# - Secrets not found → Check Secrets Manager
```

### RDS Connection Failed
```bash
# Check security group
aws ec2 describe-security-groups \
  --group-ids <RDS_SG_ID> \
  --query 'SecurityGroups[0].IpPermissions'

# Check RDS status
aws rds describe-db-instances \
  --db-instance-identifier analytics-platform-production-postgres \
  --query 'DBInstances[0].DBInstanceStatus'

# Test connection from ECS task
# Exec into container:
aws ecs execute-command \
  --cluster $ECS_CLUSTER \
  --task $TASK_ARN \
  --container api \
  --interactive \
  --command "/bin/sh"

# Inside container:
apk add postgresql-client
psql $DATABASE_URL
```

### CloudFlare Tunnel não conecta
```bash
# Check tunnel status
cloudflared tunnel info <TUNNEL_UUID>

# Check logs
journalctl -u cloudflared -f

# Restart tunnel
sudo systemctl restart cloudflared

# Test direct connection to ECS
curl http://<ECS_TASK_IP>:4000/health
```

### High Costs
```bash
# Check cost breakdown
aws ce get-cost-and-usage \
  --time-period Start=2025-01-01,End=2025-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=SERVICE

# Common culprits:
# - NAT Gateway ($32/mês) → Remove se não usar
# - RDS storage growth → Check database size
# - CloudWatch Logs → Reduce retention
# - Data transfer → Check bandwidth usage
```

---

## 📞 Suporte

**Documentação:**
- Infrastructure: `infrastructure-setup.md`
- Database Schema: `database_schema_updated.md`
- Business Rules: `business_rules_updated.md`

**AWS Support:**
- Basic (incluído): Response time 24h
- Developer ($29/mês): Response time 12h
- Business ($100/mês): Response time 1h

**Comunidade:**
- GitHub Issues: [repo]/issues
- Discord: [link]

---

## 💰 Custos Estimados

### Infraestrutura (~$31/mês)
- ECS Fargate: $8/mês
- RDS PostgreSQL: $16/mês
- EFS: $3/mês
- Route 53: $0.50/mês
- S3 + ECR: $0.62/mês
- CloudWatch: $3/mês
- CloudFlare: $0 (free tier)
- Vercel: $0 (free tier)

### Opcional
- Sentry Cloud: $26/mês
- CloudFlare Pro: $20/mês
- Vercel Pro: $20/mês
- AWS Support Developer: $29/mês

**Total: $31-106/mês** (dependendo dos opcionais)

---

**Boa sorte com o deploy! 🚀**

**Última atualização:** 2025-10-29  
**Versão:** 1.0
