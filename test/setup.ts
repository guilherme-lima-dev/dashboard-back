import { TestDatabaseConfig } from './database.config';

// Setup global para todos os testes
beforeAll(async () => {
  // Configurar timeout global
  jest.setTimeout(30000);
});

afterAll(async () => {
  // Cleanup global após todos os testes
  await TestDatabaseConfig.cleanup();
});

// Limpar dados entre cada teste
beforeEach(async () => {
  // Aguardar um pouco para evitar conflitos de concorrência
  await new Promise(resolve => setTimeout(resolve, 100));
});

afterEach(async () => {
  // Cleanup após cada teste
  await TestDatabaseConfig.cleanup();
});
