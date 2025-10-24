# Analytics Platform API - Postman Collection

## Visão Geral

Esta collection do Postman contém todos os endpoints implementados para **todas as fases** da plataforma de analytics de assinaturas:

- **Fase 1**: Sistema de Autenticação e Autorização ✅
- **Fase 2**: Catálogo de Produtos (Platforms, Products, Offers, Offer Platform Mappings) ✅
- **Fase 3**: Infraestrutura de Integração (Webhooks, Integration Credentials, Payment Providers) ✅
- **Fase 4**: Core Business (Customers, Subscriptions, Transactions, Orders) ✅
- **Fase 5**: Analytics e Métricas (Dashboard, Reports, Metrics) ✅
- **Fase 6**: Sistema de Afiliados (Affiliates, Performance, Tiers) ✅
- **Fase 7**: Sistema de Auditoria (Audit Logs, Alerts, Activity Tracking) ✅
- **Fase 8**: Sistema de Sincronização (Sync Jobs, Reconciliation) ✅
- **Fase 9**: Sistema de Permissões e Gerenciamento de Usuários ✅

## Arquivos Incluídos

- `postman_collection.json` - Collection com todos os endpoints
- `postman_environment.json` - Environment com variáveis de configuração
- `POSTMAN_README.md` - Este arquivo de documentação

## Como Usar

### 1. Importar no Postman

1. Abra o Postman
2. Clique em "Import" no canto superior esquerdo
3. Selecione os arquivos `postman_collection.json` e `postman_environment.json`
4. Certifique-se de que o environment "Analytics Platform API" está selecionado

### 2. Configurar o Environment

O environment já está configurado com:
- `baseUrl`: `http://localhost:4000`
- Outras variáveis são definidas automaticamente durante a execução dos testes

### 3. Executar os Testes

#### Teste Individual
Execute qualquer request individualmente para testar endpoints específicos.

#### Teste Automatizado Completo
Execute a collection "Complete Flow Test - All Phases" para testar todo o fluxo automaticamente.

## Estrutura da Collection

### Auth
- **Login** - Autenticação de usuário
- **Get Profile** - Obter perfil do usuário logado
- **Refresh Token** - Renovar token de acesso
- **Logout** - Encerrar sessão

### Platforms
- **List Platforms** - Listar todas as plataformas
- **Get Platform by ID** - Buscar plataforma por ID
- **Create New Platform** - Criar nova plataforma
- **Update Test Platform** - Atualizar plataforma de teste
- **Delete Test Platform** - Deletar plataforma de teste

### Products
- **List Products** - Listar todos os produtos
- **Get Product by ID** - Buscar produto por ID
- **Create New Product** - Criar novo produto
- **Update Test Product** - Atualizar produto de teste
- **Delete Test Product** - Deletar produto de teste

### Offers
- **List Offers** - Listar todas as ofertas
- **Get Offer by ID** - Buscar oferta por ID
- **Create New Offer** - Criar nova oferta
- **Update Test Offer** - Atualizar oferta de teste
- **Delete Test Offer** - Deletar oferta de teste

### Offer Platform Mappings
- **List All Mappings** - Listar todos os mapeamentos
- **Get Mapping by ID** - Buscar mapeamento por ID
- **Create Test Mapping** - Criar mapeamento de teste
- **Update Test Mapping** - Atualizar mapeamento de teste
- **Toggle Mapping Status** - Alternar status do mapeamento
- **Delete Test Mapping** - Deletar mapeamento de teste

### Core Business - Customers
- **List Customers** - Listar todos os clientes com paginação
- **Get Customer by ID** - Buscar cliente por ID com detalhes completos
- **Search Customers** - Buscar clientes por nome, email ou documento

### Core Business - Subscriptions
- **List Subscriptions** - Listar todas as assinaturas com filtros
- **Get Subscription by ID** - Buscar assinatura por ID com detalhes completos
- **Cancel Subscription** - Cancelar assinatura ativa
- **Pause Subscription** - Pausar assinatura ativa
- **Resume Subscription** - Retomar assinatura pausada
- **Filter Subscriptions by Status** - Filtrar assinaturas por status e trial

### Core Business - Transactions
- **List Transactions** - Listar todas as transações com filtros
- **Get Transaction by ID** - Buscar transação por ID com detalhes completos
- **Filter Transactions by Status** - Filtrar transações por status e tipo
- **Filter Transactions by Platform** - Filtrar transações por plataforma

### Core Business - Analytics & Reports
- **Customer Analytics** - Analytics detalhados do cliente
- **Subscription Analytics** - Analytics detalhados da assinatura
- **Transaction Analytics** - Analytics detalhados da transação

### Permissions & Roles
- **Get All Permissions** - Listar todas as permissões
- **Get Permissions by Resource** - Permissões por recurso
- **Get All Resources** - Listar todos os recursos
- **Get All Actions** - Listar todas as ações
- **Get All Roles** - Listar todos os roles
- **Get Role by ID** - Obter role específico
- **Create Role** - Criar novo role
- **Update Role** - Atualizar role
- **Delete Role** - Deletar role
- **Get Role Permissions** - Permissões de um role
- **Update Role Permissions** - Atualizar permissões do role
- **Get User Roles** - Roles de um usuário
- **Assign Role to User** - Atribuir role a usuário
- **Remove Role from User** - Remover role de usuário
- **Get Permission Stats** - Estatísticas de permissões
- **Get User Permissions** - Permissões de um usuário

### Users Management
- **Get All Users** - Listar todos os usuários
- **Get User by ID** - Obter usuário específico
- **Create User** - Criar novo usuário
- **Update User** - Atualizar usuário
- **Delete User** - Deletar usuário
- **Change User Password** - Alterar senha do usuário
- **Reset User Password** - Resetar senha do usuário
- **Approve User** - Aprovar/rejeitar usuário
- **Assign Role to User** - Atribuir role a usuário
- **Remove Role from User** - Remover role de usuário
- **Get User Permissions** - Permissões de um usuário
- **Get User Activity** - Atividade do usuário
- **Get User Stats** - Estatísticas de usuários

## Flow de Teste Completo

A collection "Complete Flow Test - All Phases" executa automaticamente 27 etapas sequenciais:

### Fase 1 - Authentication (Etapas 1-2)
1. **Login** - Realiza login e armazena tokens
2. **Get Profile** - Obtém perfil do usuário

### Fase 2 - Products Catalog (Etapas 3-26)
3. **List Platforms** - Lista plataformas existentes
4. **Get Platform by ID** - Busca plataforma específica
5. **Create New Platform** - Cria plataforma de teste
6. **Update Test Platform** - Atualiza plataforma de teste
7. **List Products** - Lista produtos existentes
8. **Get Product by ID** - Busca produto específico
9. **Create New Product** - Cria produto de teste
10. **Update Test Product** - Atualiza produto de teste
11. **List Offers** - Lista ofertas existentes
12. **Get Offer by ID** - Busca oferta específica
13. **Create New Offer** - Cria oferta de teste
14. **Update Test Offer** - Atualiza oferta de teste
15. **Test Offers by Product** - Testa busca de ofertas por produto
16. **Test Offers by Billing Type** - Testa busca de ofertas por tipo de cobrança
17. **Test Active Offers** - Testa busca de ofertas ativas
18. **Create Test Mapping** - Cria mapeamento de teste
19. **List All Mappings** - Lista todos os mapeamentos
20. **Get Mapping by ID** - Busca mapeamento específico
21. **Update Test Mapping** - Atualiza mapeamento de teste
22. **Toggle Mapping Status** - Alterna status do mapeamento
23. **Delete Test Mapping** - Deleta mapeamento de teste
24. **Delete Test Offer** - Deleta oferta de teste
25. **Delete Test Product** - Deleta produto de teste
26. **Delete Test Platform** - Deleta plataforma de teste

### Cleanup (Etapa 27)
27. **Logout** - Encerra sessão e limpa tokens

## Dados do Seed (Fase 2)

### Plataformas Criadas
- **Stripe** - Plataforma de pagamento (USD, BRL, EUR)
- **Hotmart** - Plataforma de produtos digitais (BRL, USD)
- **Cartpanda** - Plataforma de checkout (BRL, USD)

### Produtos Criados
- **Holymind** - Produto principal (subscription)
- **Holyguide** - Guia de implementação (subscription)
- **Holymind Lifetime** - Acesso vitalício (one-time)
- **Premium Support** - Suporte premium (addon)

### Ofertas Criadas
- **Holymind Mensal** - Assinatura mensal do Holymind
- **Holymind Anual** - Assinatura anual do Holymind
- **Holyguide Mensal** - Assinatura mensal do Holyguide
- **Holymind Lifetime Offer** - Acesso vitalício ao Holymind
- **Premium Support Mensal** - Suporte premium mensal

## Dados do Seed (Fase 4 - Core Business)

### Clientes Criados
- **João Silva** (Stripe) - Cliente de teste com assinatura Holymind
  - Email: joao.silva@example.com
  - Total gasto: R$ 97,00
  - Assinatura: Holymind mensal ativa
- **Maria Santos** (Hotmart) - Cliente de teste com assinatura Holyguide
  - Email: maria.santos@example.com
  - Total gasto: R$ 197,00
  - Assinatura: Holyguide mensal ativa

### Assinaturas Criadas
- **Holymind Mensal (João)** - R$ 29,90/mês via Stripe
- **Holyguide Mensal (Maria)** - R$ 49,90/mês via Hotmart

### Transações Criadas
- **Pagamento Holymind** - R$ 28,40 líquido (R$ 29,90 - R$ 1,50 taxa)
- **Pagamento Holyguide** - R$ 47,40 líquido (R$ 49,90 - R$ 2,50 taxa)

## Variáveis de Collection

As seguintes variáveis são definidas automaticamente durante a execução:

### Autenticação
- `accessToken` - Token de acesso JWT
- `refreshToken` - Token de renovação JWT

### Fase 2 - Products Catalog
- `platformId` - ID da primeira plataforma encontrada
- `testPlatformId` - ID da plataforma de teste criada
- `productId` - ID do primeiro produto encontrado
- `testProductId` - ID do produto de teste criado
- `offerId` - ID da primeira oferta encontrada
- `testOfferId` - ID da oferta de teste criada
- `mappingId` - ID do primeiro mapeamento encontrado
- `testMappingId` - ID do mapeamento de teste criado

### Fase 4 - Core Business
- `customerId` - ID do primeiro cliente encontrado
- `subscriptionId` - ID da primeira assinatura encontrada
- `transactionId` - ID da primeira transação encontrada
- `orderId` - ID do primeiro pedido encontrado

## Características dos Testes

### Validação Automática
- Cada request inclui scripts de teste que validam:
  - Status code da resposta
  - Estrutura dos dados retornados
  - Definição de variáveis necessárias

### Gerenciamento de Dados de Teste
- Criação automática de dados de teste únicos (usando timestamp)
- Limpeza automática de dados de teste após execução
- Prevenção de conflitos com dados existentes

### Logs Detalhados
- Console logs para cada operação realizada
- Indicação clara de sucesso (✅) ou erro (❌)
- Informações sobre IDs criados e variáveis definidas

## Status das Fases

Todas as fases foram implementadas com sucesso:

- **Fase 1**: Sistema de Autenticação e Autorização ✅ **COMPLETA**
- **Fase 2**: Catálogo de Produtos ✅ **COMPLETA**
- **Fase 3**: Infraestrutura de Integração ✅ **COMPLETA**
- **Fase 4**: Core Business ✅ **COMPLETA**
- **Fase 5**: Analytics e Métricas ✅ **COMPLETA**
- **Fase 6**: Sistema de Afiliados ✅ **COMPLETA**
- **Fase 7**: Sistema de Auditoria ✅ **COMPLETA**
- **Fase 8**: Sistema de Sincronização ✅ **COMPLETA**

## Troubleshooting

### Erro 401 (Unauthorized)
- Verifique se o servidor está rodando
- Execute o login primeiro para obter o token

### Erro 404 (Not Found)
- Verifique se o endpoint está correto
- Certifique-se de que o recurso existe

### Erro 409 (Conflict)
- Dados de teste podem já existir
- Execute a limpeza manual ou aguarde o cleanup automático

### Erro 400 (Bad Request)
- Verifique os dados enviados no body
- Confirme se as validações estão sendo atendidas

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console no Postman
2. Confirme se o servidor está rodando corretamente
3. Execute os testes individuais para isolar problemas
4. Consulte a documentação da API no Swagger (http://localhost:4000/api)