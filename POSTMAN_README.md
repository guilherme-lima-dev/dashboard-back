# 📮 Postman Collection - Analytics Platform API

## 📋 Visão Geral

Esta collection do Postman contém todos os endpoints da **Fase 1 (Authentication)** e **Fase 2 (Platforms)** do Analytics Platform API.

## 🚀 Como Usar

### 1. Importar a Collection

1. Abra o Postman
2. Clique em **Import**
3. Selecione os arquivos:
   - `postman_collection.json` (Collection)
   - `postman_environment.json` (Environment)

### 2. Configurar Environment

1. Selecione o environment **"Analytics Platform - Local"**
2. Verifique se a `baseUrl` está configurada como `http://localhost:4000`

### 3. Iniciar o Servidor

```bash
# No terminal, dentro do projeto
npm run start:dev
```

### 4. Executar os Testes

#### 🔐 **Authentication Flow**
1. Execute **"Login"** primeiro
2. Os tokens serão salvos automaticamente nas variáveis
3. Execute **"Get Profile"** para testar autenticação

#### 🏪 **Platforms Flow**
1. Execute **"List All Platforms"** para ver as plataformas do seed
2. Execute **"Create Platform"** para criar uma nova
3. Execute **"Update Platform"** para modificar
4. Execute **"Delete Platform"** para remover

#### 🧪 **Test Scenarios**
Execute **"Complete Flow Test - All Phases"** para um teste automatizado completo de todas as funcionalidades das Fases 1, 2 e 3.

## 📊 Endpoints Disponíveis

### 🔐 Authentication
- `POST /auth/login` - Login com email/senha
- `POST /auth/refresh` - Renovar access token
- `POST /auth/me` - Obter perfil do usuário
- `POST /auth/logout` - Logout e invalidar token

### 🏪 Platforms
- `GET /platforms` - Listar todas as plataformas
- `GET /platforms/:id` - Buscar plataforma por ID
- `GET /platforms/slug/:slug` - Buscar plataforma por slug
- `POST /platforms` - Criar nova plataforma
- `PATCH /platforms/:id` - Atualizar plataforma
- `DELETE /platforms/:id` - Deletar plataforma

### 📦 Products
- `GET /products` - Listar todos os produtos
- `GET /products?type=subscription` - Filtrar por tipo
- `GET /products?active=true` - Filtrar apenas ativos
- `GET /products/:id` - Buscar produto por ID
- `GET /products/slug/:slug` - Buscar produto por slug
- `GET /products/type/:type` - Listar por tipo específico
- `GET /products/active/list` - Listar apenas ativos
- `POST /products` - Criar novo produto
- `PATCH /products/:id` - Atualizar produto
- `DELETE /products/:id` - Deletar produto

### 💎 Offers
- `GET /offers` - Listar todas as ofertas
- `GET /offers?productId=:id` - Filtrar por produto
- `GET /offers?billingType=recurring` - Filtrar por tipo de cobrança
- `GET /offers?active=true` - Filtrar apenas ativas
- `GET /offers/:id` - Buscar por ID
- `GET /offers/slug/:slug` - Buscar por slug
- `GET /offers/product/:productId` - Listar por produto
- `GET /offers/type/:billingType` - Listar por tipo de cobrança
- `GET /offers/active/list` - Listar ativas
- `POST /offers` - Criar oferta
- `PATCH /offers/:id` - Atualizar oferta
- `DELETE /offers/:id` - Deletar oferta

## 🔧 Variáveis da Collection

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `baseUrl` | URL base da API | `http://localhost:4000` |
| `accessToken` | Token JWT de acesso | `eyJhbGciOiJIUzI1NiIs...` |
| `refreshToken` | Token JWT de renovação | `eyJhbGciOiJIUzI1NiIs...` |
| `platformId` | ID da plataforma atual | `uuid-123` |
| `testPlatformId` | ID da plataforma de teste | `uuid-456` |
| `productId` | ID do produto atual | `uuid-789` |
| `testProductId` | ID do produto de teste | `uuid-012` |
| `offerId` | ID da oferta atual | `uuid-345` |
| `testOfferId` | ID da oferta de teste | `uuid-678` |

## 🧪 Testes Automatizados

A collection inclui **testes automatizados** que:

- ✅ Salvam tokens automaticamente após login
- ✅ Salvam IDs de plataformas, produtos e ofertas criadas
- ✅ Validam códigos de resposta HTTP
- ✅ Exibem logs detalhados no console do Postman
- ✅ Testam todas as funcionalidades das Fases 1, 2 e 3
- ✅ Executam fluxo completo de CRUD para todos os módulos

### Como Ver os Logs:
1. Abra o **Console** do Postman (View → Show Postman Console)
2. Execute as requisições
3. Veja os logs de sucesso/erro

### 🚀 Flow de Teste Completo:

O **"Complete Flow Test - All Phases"** executa **21 etapas** sequenciais:

#### **Fase 1 - Authentication (Etapas 1-2):**
1. **Login** - Autentica e salva tokens
2. **Get Profile** - Valida autenticação

#### **Fase 2 - Platforms (Etapas 3-6):**
3. **List Platforms** - Lista plataformas existentes
4. **Get Platform by ID** - Busca plataforma específica
5. **Create New Platform** - Cria plataforma de teste
6. **Update Test Platform** - Atualiza plataforma criada

#### **Fase 3 - Products (Etapas 7-10):**
7. **List Products** - Lista produtos existentes
8. **Get Product by ID** - Busca produto específico
9. **Create New Product** - Cria produto de teste
10. **Update Test Product** - Atualiza produto criado

#### **Fase 3 - Offers (Etapas 11-18):**
11. **List Offers** - Lista ofertas existentes
12. **Get Offer by ID** - Busca oferta específica
13. **Create New Offer** - Cria oferta de teste
14. **Update Test Offer** - Atualiza oferta criada
15. **Test Offers by Product** - Testa filtro por produto
16. **Test Offers by Billing Type** - Testa filtro por tipo
17. **Test Active Offers** - Testa filtro por status
18. **Delete Test Offer** - Remove oferta de teste

#### **Cleanup (Etapas 19-21):**
19. **Delete Test Product** - Remove produto de teste
20. **Delete Test Platform** - Remove plataforma de teste
21. **Logout** - Finaliza sessão

### ⏱️ Tempo Estimado:
- **Duração total**: ~2-3 minutos
- **Requisições**: 21 requests sequenciais
- **Cobertura**: 100% das funcionalidades implementadas

## 📝 Dados de Teste

### Credenciais Padrão:
- **Email**: `admin@analytics.com`
- **Senha**: `Admin@123`

### Plataformas do Seed:
- **Stripe** (slug: `stripe`)
- **Hotmart** (slug: `hotmart`)
- **Cartpanda** (slug: `cartpanda`)

### Produtos do Seed:
- **Holymind** (slug: `holymind`, tipo: `subscription`)
- **Holyguide** (slug: `holyguide`, tipo: `subscription`)
- **Holymind Lifetime** (slug: `holymind-lifetime`, tipo: `one_time`)
- **Premium Support** (slug: `premium-support`, tipo: `addon`)

### Ofertas do Seed:
- **Holymind Mensal** (slug: `holymind-mensal`, tipo: `recurring`)
- **Holymind Anual** (slug: `holymind-anual`, tipo: `recurring`)
- **Holyguide Mensal** (slug: `holyguide-mensal`, tipo: `recurring`)
- **Holymind Lifetime** (slug: `holymind-lifetime-offer`, tipo: `one_time`)
- **Premium Support Mensal** (slug: `premium-support-mensal`, tipo: `recurring`)

## 🚨 Troubleshooting

### Erro 401 (Unauthorized)
- Execute o **Login** primeiro
- Verifique se o `accessToken` foi salvo

### Erro 500 (Internal Server Error)
- Verifique se o servidor está rodando
- Verifique os logs do servidor

### Erro de Conexão
- Verifique se a `baseUrl` está correta
- Verifique se o servidor está rodando na porta 4000

## 📚 Documentação Swagger

A documentação completa da API está disponível em:
```
http://localhost:4000/api/docs
```

## 🔄 Próximas Fases

Esta collection será atualizada conforme novas fases forem implementadas:
- **Fase 3**: Products & Offers ✅ **CONCLUÍDA**
- **Fase 4**: Customers & Sales
- **Fase 5**: Analytics & Metrics

---

**Desenvolvido para o Analytics Platform API** 🚀
