# Guia Completo de Testes - Analytics Platform

## 🎯 Visão Geral

Este guia fornece instruções completas para testar todas as funcionalidades da Analytics Platform, incluindo testes automatizados, manuais e de integração.

## 🚀 Início Rápido

### 1. Preparação do Ambiente

```bash
# Instalar dependências
npm install

# Configurar banco de dados
npx prisma migrate dev

# Executar seed
npx prisma db seed

# Iniciar servidor
npm run start:dev
```

### 2. Verificar Serviços

```bash
# Verificar se o servidor está rodando
curl http://localhost:4000/health

# Verificar Swagger
open http://localhost:4000/api/docs

# Verificar Bull Board
open http://localhost:4000/admin/queues
```

## 🧪 Tipos de Testes

### 1. Testes Unitários

```bash
# Executar todos os testes unitários
npm run test

# Executar testes com watch mode
npm run test:watch

# Executar testes com cobertura
npm run test:cov

# Executar testes específicos
npm run test -- --testNamePattern="AuthService"
```

### 2. Testes de Integração

```bash
# Executar testes e2e
npm run test:e2e

# Executar testes e2e com watch mode
npm run test:e2e -- --watch

# Executar testes e2e específicos
npm run test:e2e -- --testNamePattern="Auth"
```

### 3. Testes com Postman

#### Importar Collection

1. Abra o Postman
2. Clique em "Import"
3. Selecione `postman_collection.json`
4. Selecione `postman_environment.json`
5. Certifique-se de que o environment está selecionado

#### Executar Testes Automatizados

```bash
# Executar collection completa
# 1. Selecione a collection "Analytics Platform API - Complete"
# 2. Clique em "Run collection"
# 3. Aguarde a execução de todos os testes
```

## 📋 Checklist de Testes

### ✅ Autenticação (Fase 1)

#### Testes Básicos
- [ ] **Login** - Credenciais válidas
- [ ] **Login** - Credenciais inválidas
- [ ] **Get Profile** - Token válido
- [ ] **Get Profile** - Token inválido
- [ ] **Refresh Token** - Token válido
- [ ] **Logout** - Sessão encerrada

#### Testes de Permissões
- [ ] **Acesso com permissões** - Sucesso
- [ ] **Acesso sem permissões** - Erro 403
- [ ] **Token expirado** - Erro 401
- [ ] **Token inválido** - Erro 401

### ✅ Catálogo de Produtos (Fase 2)

#### Platforms
- [ ] **List Platforms** - Retorna todas as plataformas
- [ ] **Get Platform by ID** - Retorna plataforma específica
- [ ] **Create Platform** - Cria nova plataforma
- [ ] **Update Platform** - Atualiza plataforma
- [ ] **Delete Platform** - Remove plataforma

#### Products
- [ ] **List Products** - Retorna todos os produtos
- [ ] **Get Product by ID** - Retorna produto específico
- [ ] **Create Product** - Cria novo produto
- [ ] **Update Product** - Atualiza produto
- [ ] **Delete Product** - Remove produto

#### Offers
- [ ] **List Offers** - Retorna todas as ofertas
- [ ] **Get Offer by ID** - Retorna oferta específica
- [ ] **Create Offer** - Cria nova oferta
- [ ] **Update Offer** - Atualiza oferta
- [ ] **Delete Offer** - Remove oferta

#### Mappings
- [ ] **List Mappings** - Retorna todos os mapeamentos
- [ ] **Create Mapping** - Cria novo mapeamento
- [ ] **Update Mapping** - Atualiza mapeamento
- [ ] **Toggle Mapping** - Alterna status
- [ ] **Delete Mapping** - Remove mapeamento

### ✅ Integração (Fase 3)

#### Webhooks
- [ ] **Stripe Webhook** - Processa eventos Stripe
- [ ] **Hotmart Webhook** - Processa eventos Hotmart
- [ ] **Cartpanda Webhook** - Processa eventos Cartpanda
- [ ] **Webhook Validation** - Valida assinaturas
- [ ] **Webhook Retry** - Reprocessa eventos falhados

#### Credentials
- [ ] **Create Credential** - Cria nova credencial
- [ ] **Update Credential** - Atualiza credencial
- [ ] **Test Connection** - Testa conexão
- [ ] **Delete Credential** - Remove credencial

### ✅ Core Business (Fase 4)

#### Customers
- [ ] **List Customers** - Retorna todos os clientes
- [ ] **Get Customer by ID** - Retorna cliente específico
- [ ] **Search Customers** - Busca clientes
- [ ] **Customer Analytics** - Métricas do cliente

#### Subscriptions
- [ ] **List Subscriptions** - Retorna todas as assinaturas
- [ ] **Get Subscription by ID** - Retorna assinatura específica
- [ ] **Cancel Subscription** - Cancela assinatura
- [ ] **Pause Subscription** - Pausa assinatura
- [ ] **Resume Subscription** - Retoma assinatura

#### Transactions
- [ ] **List Transactions** - Retorna todas as transações
- [ ] **Get Transaction by ID** - Retorna transação específica
- [ ] **Filter Transactions** - Filtra transações
- [ ] **Transaction Analytics** - Métricas da transação

### ✅ Analytics (Fase 5)

#### Dashboard
- [ ] **Dashboard Metrics** - Métricas principais
- [ ] **Revenue Metrics** - Métricas de receita
- [ ] **Customer Metrics** - Métricas de clientes
- [ ] **Subscription Metrics** - Métricas de assinaturas

#### Reports
- [ ] **Generate Report** - Gera relatório
- [ ] **Get Report Status** - Status do relatório
- [ ] **Download Report** - Download do relatório

### ✅ Afiliados (Fase 6)

#### Affiliates
- [ ] **List Affiliates** - Retorna todos os afiliados
- [ ] **Get Affiliate by ID** - Retorna afiliado específico
- [ ] **Create Affiliate** - Cria novo afiliado
- [ ] **Update Affiliate** - Atualiza afiliado
- [ ] **Delete Affiliate** - Remove afiliado

#### Performance
- [ ] **Affiliate Dashboard** - Dashboard do afiliado
- [ ] **Performance Metrics** - Métricas de performance
- [ ] **Recalculate Tiers** - Recalcula tiers

### ✅ Auditoria (Fase 7)

#### Audit Logs
- [ ] **List Audit Logs** - Retorna logs de auditoria
- [ ] **Get Audit Log by ID** - Retorna log específico
- [ ] **Audit Stats** - Estatísticas de auditoria

#### Alerts
- [ ] **List Alerts** - Retorna alertas
- [ ] **Get Alert by ID** - Retorna alerta específico
- [ ] **Update Alert** - Atualiza alerta

### ✅ Sincronização (Fase 8)

#### Sync Jobs
- [ ] **Sync All Platforms** - Sincroniza todas as plataformas
- [ ] **Sync Platform** - Sincroniza plataforma específica
- [ ] **Sync Stats** - Estatísticas de sincronização
- [ ] **Sync Logs** - Logs de sincronização

## 🔧 Testes Específicos

### Teste de Integração com Stripe

#### 1. Configurar Credenciais

```bash
# Fazer login
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@analytics.com", "password": "Admin@123"}' | jq -r '.accessToken')

# Obter ID da plataforma Stripe
PLATFORM_ID=$(curl -s -X GET "http://localhost:4000/platforms" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.[] | select(.slug=="stripe") | .id')

# Atualizar credencial com API key real
curl -X PATCH "http://localhost:4000/integration-credentials/CREDENTIAL_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"credentialValue": "sk_test_SUA_CHAVE_REAL"}'
```

#### 2. Testar Sincronização

```bash
# Trigger sync manual
curl -X POST "http://localhost:4000/sync/platform/$PLATFORM_ID" \
  -H "Authorization: Bearer $TOKEN"

# Verificar estatísticas
curl -X GET "http://localhost:4000/sync/stats?platformId=$PLATFORM_ID" \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. Testar Webhooks

```bash
# Usar Stripe CLI para testar webhooks
stripe listen --forward-to localhost:4000/webhooks/stripe

# Em outro terminal, simular evento
stripe trigger payment_intent.succeeded
```

### Teste de Performance

#### 1. Teste de Carga

```bash
# Instalar artillery
npm install -g artillery

# Executar teste de carga
artillery run load-test.yml
```

#### 2. Teste de Memória

```bash
# Executar com profiling
node --inspect --inspect-brk dist/main.js

# Monitorar memória
node --max-old-space-size=4096 dist/main.js
```

### Teste de Segurança

#### 1. Teste de Autenticação

```bash
# Testar token inválido
curl -H "Authorization: Bearer invalid_token" http://localhost:4000/auth/me

# Testar token expirado
curl -H "Authorization: Bearer expired_token" http://localhost:4000/auth/me
```

#### 2. Teste de Autorização

```bash
# Testar acesso sem permissão
curl -H "Authorization: Bearer $TOKEN" http://localhost:4000/admin/users
```

## 📊 Métricas de Teste

### Cobertura de Código

```bash
# Executar com cobertura
npm run test:cov

# Verificar relatório
open coverage/lcov-report/index.html
```

### Métricas de Performance

```bash
# Executar benchmark
npm run test:benchmark

# Verificar métricas
curl http://localhost:4000/metrics
```

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro 401 (Unauthorized)
```bash
# Verificar se o servidor está rodando
curl http://localhost:4000/health

# Verificar token
echo $TOKEN
```

#### 2. Erro 404 (Not Found)
```bash
# Verificar endpoint
curl http://localhost:4000/api/docs

# Verificar se o recurso existe
curl http://localhost:4000/platforms
```

#### 3. Erro 500 (Internal Server Error)
```bash
# Verificar logs do servidor
npm run start:dev

# Verificar banco de dados
npx prisma studio
```

### Logs de Debug

```bash
# Executar com debug
DEBUG=* npm run start:dev

# Verificar logs específicos
tail -f logs/app.log
```

## 📈 Relatórios de Teste

### Gerar Relatório

```bash
# Executar todos os testes
npm run test:all

# Gerar relatório
npm run test:report
```

### Métricas de Qualidade

- **Cobertura de Código**: > 80%
- **Testes Unitários**: > 90%
- **Testes de Integração**: > 85%
- **Performance**: < 200ms
- **Disponibilidade**: > 99.9%

## ✅ Checklist Final

### Pré-Produção
- [ ] Todos os testes passando
- [ ] Cobertura de código > 80%
- [ ] Performance validada
- [ ] Segurança testada
- [ ] Documentação atualizada

### Produção
- [ ] Monitoramento configurado
- [ ] Logs centralizados
- [ ] Alertas configurados
- [ ] Backup configurado
- [ ] CI/CD configurado

## 🎯 Conclusão

Este guia fornece uma abordagem completa para testar a Analytics Platform. Siga os passos em ordem e verifique cada item do checklist para garantir que o sistema está funcionando corretamente.

Para dúvidas ou problemas, consulte a documentação adicional ou entre em contato com a equipe de desenvolvimento.

---

**Status**: ✅ **Guia de Testes Completo**
