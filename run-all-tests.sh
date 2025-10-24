#!/bin/bash

# 🧪 SCRIPT DE EXECUÇÃO DE TODOS OS TESTES
# Este script executa todos os testes do sistema de forma organizada

echo "🚀 INICIANDO EXECUÇÃO DE TODOS OS TESTES"
echo "========================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para executar testes com cores
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${BLUE}🧪 Executando: $test_name${NC}"
    echo "----------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name - PASSOU${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name - FALHOU${NC}"
        return 1
    fi
}

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 1. TESTES DE BACKEND (E2E)
echo -e "\n${YELLOW}📋 EXECUTANDO TESTES DE BACKEND (E2E)${NC}"
echo "=========================================="

# Analytics Controller
run_test "Analytics Controller E2E" "npm run test:e2e -- --testPathPattern=analytics.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Auth Controller
run_test "Auth Controller E2E" "npm run test:e2e -- --testPathPattern=auth.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Users Controller
run_test "Users Controller E2E" "npm run test:e2e -- --testPathPattern=users.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Platforms Controller
run_test "Platforms Controller E2E" "npm run test:e2e -- --testPathPattern=platforms.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Products Controller
run_test "Products Controller E2E" "npm run test:e2e -- --testPathPattern=products.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Customers Controller
run_test "Customers Controller E2E" "npm run test:e2e -- --testPathPattern=customers.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Transactions Controller
run_test "Transactions Controller E2E" "npm run test:e2e -- --testPathPattern=transactions.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Subscriptions Controller
run_test "Subscriptions Controller E2E" "npm run test:e2e -- --testPathPattern=subscriptions.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Affiliates Controller
run_test "Affiliates Controller E2E" "npm run test:e2e -- --testPathPattern=affiliates.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Permissions Controller
run_test "Permissions Controller E2E" "npm run test:e2e -- --testPathPattern=permissions.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Audit Controller
run_test "Audit Controller E2E" "npm run test:e2e -- --testPathPattern=audit.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Sync Controller
run_test "Sync Controller E2E" "npm run test:e2e -- --testPathPattern=sync.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# Integration Credentials Controller
run_test "Integration Credentials Controller E2E" "npm run test:e2e -- --testPathPattern=integration-credentials.controller.e2e-spec.ts"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# 2. TESTES UNITÁRIOS
echo -e "\n${YELLOW}📋 EXECUTANDO TESTES UNITÁRIOS${NC}"
echo "=================================="

run_test "Unit Tests" "npm run test"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# 3. TESTES DE LINTING
echo -e "\n${YELLOW}📋 EXECUTANDO TESTES DE LINTING${NC}"
echo "====================================="

run_test "ESLint" "npm run lint"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# 4. TESTES DE BUILD
echo -e "\n${YELLOW}📋 EXECUTANDO TESTES DE BUILD${NC}"
echo "===================================="

run_test "Build Test" "npm run build"
TOTAL_TESTS=$((TOTAL_TESTS + 1))
if [ $? -eq 0 ]; then PASSED_TESTS=$((PASSED_TESTS + 1)); else FAILED_TESTS=$((FAILED_TESTS + 1)); fi

# 5. RELATÓRIO FINAL
echo -e "\n${YELLOW}📊 RELATÓRIO FINAL${NC}"
echo "=================="
echo -e "Total de Testes: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Testes Aprovados: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Testes Falharam: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 TODOS OS TESTES PASSARAM!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ ALGUNS TESTES FALHARAM${NC}"
    echo -e "Taxa de Sucesso: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
    exit 1
fi
