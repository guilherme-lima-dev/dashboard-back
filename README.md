# Analytics Platform API

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
</p>

<p align="center">
  <strong>Plataforma completa de analytics para assinaturas com integração de múltiplas plataformas de pagamento</strong>
</p>

<p align="center">
  <a href="https://nestjs.com/" target="_blank">NestJS</a> • 
  <a href="https://www.prisma.io/" target="_blank">Prisma</a> • 
  <a href="https://stripe.com/" target="_blank">Stripe</a> • 
  <a href="https://www.hotmart.com/" target="_blank">Hotmart</a> • 
  <a href="https://cartpanda.com/" target="_blank">Cartpanda</a>
</p>

## 🚀 Visão Geral

A **Analytics Platform API** é uma solução completa para análise de dados de assinaturas, oferecendo:

- **Integração Multi-Plataforma**: Stripe, Hotmart, Cartpanda
- **Analytics Avançados**: Métricas, relatórios e dashboards
- **Sistema de Afiliados**: Gestão completa de afiliados e comissões
- **Auditoria Completa**: Logs de atividades e alertas
- **Sincronização Automática**: Reconciliação de dados entre plataformas
- **Webhooks em Tempo Real**: Processamento instantâneo de eventos

## 📋 Fases Implementadas

### ✅ **Fase 1: Autenticação e Autorização**
- Sistema JWT com refresh tokens
- Controle de permissões granular
- Middleware de autenticação

### ✅ **Fase 2: Catálogo de Produtos**
- Gestão de plataformas (Stripe, Hotmart, Cartpanda)
- Catálogo de produtos e ofertas
- Mapeamento produto-plataforma

### ✅ **Fase 3: Infraestrutura de Integração**
- Sistema de webhooks para todas as plataformas
- Credenciais criptografadas
- Providers de pagamento

### ✅ **Fase 4: Core Business**
- Gestão de clientes, assinaturas e transações
- Processamento de pedidos
- Normalização de dados

### ✅ **Fase 5: Analytics e Métricas**
- Dashboard com métricas em tempo real
- Relatórios personalizáveis
- Análise de coorte e churn

### ✅ **Fase 6: Sistema de Afiliados**
- Gestão de afiliados e tiers
- Métricas de performance
- Dashboard de afiliados

### ✅ **Fase 7: Sistema de Auditoria**
- Logs de atividades
- Sistema de alertas
- Rastreamento de ações críticas

### ✅ **Fase 8: Sincronização**
- Jobs de sincronização automática
- Reconciliação de dados
- Logs de sincronização

## 🛠️ Tecnologias

- **Backend**: NestJS, TypeScript, Prisma
- **Banco de Dados**: PostgreSQL
- **Cache**: Redis
- **Queue**: BullMQ
- **Documentação**: Swagger/OpenAPI
- **Testes**: Jest
- **Integração**: Stripe, Hotmart, Cartpanda

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- npm ou yarn

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd dashboard-back

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas configurações

# Execute as migrações
npx prisma migrate dev

# Execute o seed
npx prisma db seed

# Inicie o servidor
npm run start:dev
```

### Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/analytics_platform"

# Redis
REDIS_HOST="localhost"
REDIS_PORT="6379"

# Encryption
ENCRYPTION_KEY="your-256-bit-encryption-key-here"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"

# Server
PORT="4000"
NODE_ENV="development"
```

## 📚 Documentação

### API Documentation
- **Swagger UI**: http://localhost:4000/api/docs
- **JSON Schema**: http://localhost:4000/api/docs-json

### Postman Collection
- **Collection**: `postman_collection.json`
- **Environment**: `postman_environment.json`
- **Documentação**: `docs/POSTMAN_README.md`

### Guias de Desenvolvimento
- **Development Guide**: `docs/development_guide.md`
- **Business Rules**: `docs/business_rules.md`
- **Database Schema**: `docs/database_schema_updated.md`

## 🧪 Testes

### Executar Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov

# Testes com watch mode
npm run test:watch
```

### Testes com Postman

1. Importe a collection e environment no Postman
2. Execute o fluxo completo de testes
3. Verifique os logs no console

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run start:dev          # Inicia em modo desenvolvimento
npm run start:debug        # Inicia em modo debug

# Produção
npm run start:prod         # Inicia em modo produção
npm run build              # Compila o projeto

# Testes
npm run test               # Executa testes unitários
npm run test:e2e           # Executa testes e2e
npm run test:cov           # Executa testes com cobertura

# Database
npm run prisma:generate    # Gera o cliente Prisma
npm run prisma:migrate     # Executa migrações
npm run prisma:seed        # Executa seed
npm run prisma:studio      # Abre Prisma Studio

# Linting
npm run lint               # Executa ESLint
npm run lint:fix           # Corrige problemas de lint
```

## 📊 Endpoints Principais

### Autenticação
- `POST /auth/login` - Login
- `POST /auth/refresh` - Renovar token
- `GET /auth/me` - Perfil do usuário

### Analytics
- `GET /analytics/dashboard` - Dashboard principal
- `GET /analytics/revenue` - Métricas de receita
- `GET /analytics/customers` - Métricas de clientes
- `POST /analytics/reports` - Gerar relatórios

### Afiliados
- `GET /affiliates` - Listar afiliados
- `GET /affiliates/dashboard` - Dashboard de afiliados
- `GET /affiliates/performance` - Performance de afiliados

### Sincronização
- `POST /sync/all` - Sincronizar todas as plataformas
- `GET /sync/stats` - Estatísticas de sincronização
- `GET /sync/logs` - Logs de sincronização

## 🔄 Fluxo de Dados

```mermaid
graph TD
    A[Webhooks] --> B[WebhookProcessor]
    B --> C[Database]
    C --> D[Analytics]
    D --> E[Dashboard]
    
    F[Sync Jobs] --> G[Payment Providers]
    G --> H[Data Reconciliation]
    H --> C
    
    I[Affiliates] --> J[Performance Tracking]
    J --> K[Commission Calculation]
    
    L[Audit System] --> M[Activity Logs]
    M --> N[Alerts]
```

## 🚀 Deploy

### Docker

```bash
# Build da imagem
docker build -t analytics-platform .

# Executar container
docker run -p 4000:4000 analytics-platform
```

### Produção

```bash
# Build para produção
npm run build

# Iniciar em produção
npm run start:prod
```

## 📈 Monitoramento

### Health Checks
- **Health**: `GET /health`
- **Metrics**: `GET /metrics`

### Logs
- **Application Logs**: Console e arquivos
- **Audit Logs**: Sistema de auditoria
- **Sync Logs**: Logs de sincronização

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Documentação**: `docs/` directory
- **Issues**: GitHub Issues
- **Email**: dev@analytics-platform.com

## 🎯 Roadmap

- [ ] Integração com mais plataformas
- [ ] Machine Learning para previsões
- [ ] API GraphQL
- [ ] Real-time notifications
- [ ] Mobile SDK

---

<p align="center">
  Desenvolvido com ❤️ pela equipe Analytics Platform
</p>