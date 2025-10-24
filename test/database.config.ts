import { PrismaService } from '../src/prisma/prisma.service';

export class TestDatabaseConfig {
  private static prisma: PrismaService;

  static setPrisma(prisma: PrismaService) {
    TestDatabaseConfig.prisma = prisma;
  }

  static async cleanup() {
    if (!TestDatabaseConfig.prisma) {
      return;
    }

    // Limpar todas as tabelas em ordem reversa das dependências
    const tables = [
      'RefreshToken',
      'UserRole', 
      'User',
      'Affiliate',
      'TransactionSubscription',
      'Transaction',
      'Subscription',
      'Customer',
      'Product',
      'Platform',
      'AuditLog',
      'AuditAlert',
      'PermissionAuditLog',
      'RolePermission',
      'Permission',
      'Resource',
      'Action',
      'Role',
      'DailyMetrics',
      'CohortAnalysis',
      'AffiliateMetrics'
    ];

    for (const table of tables) {
      try {
        await (TestDatabaseConfig.prisma as any)[table.toLowerCase()].deleteMany({});
      } catch (error) {
        // Ignorar erros de tabelas que não existem
        console.log(`Table ${table} not found or already empty`);
      }
    }
  }

  static async seed() {
    if (!TestDatabaseConfig.prisma) {
      return;
    }

    // Criar roles básicos
    const adminRole = await TestDatabaseConfig.prisma.role.upsert({
      where: { slug: 'admin' },
      update: {},
      create: {
        name: 'Administrator',
        slug: 'admin',
        description: 'Full system access'
      }
    });

    const userRole = await TestDatabaseConfig.prisma.role.upsert({
      where: { slug: 'user' },
      update: {},
      create: {
        name: 'User',
        slug: 'user',
        description: 'Basic user access'
      }
    });

    // Criar recursos e ações
    const resources = [
      { name: 'User', slug: 'user' },
      { name: 'Platform', slug: 'platform' },
      { name: 'Product', slug: 'product' },
      { name: 'Transaction', slug: 'transaction' },
      { name: 'Subscription', slug: 'subscription' },
      { name: 'Analytics', slug: 'analytics' },
      { name: 'Audit', slug: 'audit' }
    ];

    const actions = [
      { name: 'Create', slug: 'create' },
      { name: 'Read', slug: 'read' },
      { name: 'Update', slug: 'update' },
      { name: 'Delete', slug: 'delete' }
    ];

    for (const resource of resources) {
      await TestDatabaseConfig.prisma.resource.upsert({
        where: { slug: resource.slug },
        update: {},
        create: resource
      });
    }

    for (const action of actions) {
      await TestDatabaseConfig.prisma.action.upsert({
        where: { slug: action.slug },
        update: {},
        create: action
      });
    }

    // Criar permissões para admin
    const adminPermissions = [];
    for (const resource of resources) {
      for (const action of actions) {
        const permission = await TestDatabaseConfig.prisma.permission.upsert({
          where: { 
            resourceId_actionId: {
              resourceId: (await TestDatabaseConfig.prisma.resource.findUnique({ where: { slug: resource.slug } }))!.id,
              actionId: (await TestDatabaseConfig.prisma.action.findUnique({ where: { slug: action.slug } }))!.id
            }
          },
          update: {},
          create: {
            resourceId: (await TestDatabaseConfig.prisma.resource.findUnique({ where: { slug: resource.slug } }))!.id,
            actionId: (await TestDatabaseConfig.prisma.action.findUnique({ where: { slug: action.slug } }))!.id
          }
        });
        adminPermissions.push(permission);
      }
    }

    // Associar permissões ao role admin
    for (const permission of adminPermissions) {
      await TestDatabaseConfig.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        },
        update: {},
        create: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      });
    }
  }
}
