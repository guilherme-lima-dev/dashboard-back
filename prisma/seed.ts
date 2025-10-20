import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting seed...');

    // ============================================
    // 1. ACTIONS (CRUD + Custom)
    // ============================================
    console.log('📝 Creating actions...');

    const actions = [
        { name: 'Create', slug: 'create', description: 'Create new records' },
        { name: 'Read', slug: 'read', description: 'View records' },
        { name: 'Update', slug: 'update', description: 'Modify existing records' },
        { name: 'Delete', slug: 'delete', description: 'Remove records' },
        { name: 'Export', slug: 'export', description: 'Export data to CSV/Excel' },
        { name: 'Manage', slug: 'manage', description: 'Full management access' },
    ];

    for (const action of actions) {
        await prisma.action.upsert({
            where: { slug: action.slug },
            update: {},
            create: action,
        });
    }

    console.log('✅ Actions created');

    // ============================================
    // 2. RESOURCES (Modules)
    // ============================================
    console.log('📦 Creating resources...');

    const resources = [
        { name: 'Dashboard', slug: 'dashboard', description: 'Main dashboard access' },
        { name: 'Users', slug: 'users', description: 'User management' },
        { name: 'Roles', slug: 'roles', description: 'Role management' },
        { name: 'Permissions', slug: 'permissions', description: 'Permission management' },
        { name: 'Products', slug: 'products', description: 'Product catalog' },
        { name: 'Offers', slug: 'offers', description: 'Offer management' },
        { name: 'Customers', slug: 'customers', description: 'Customer data' },
        { name: 'Subscriptions', slug: 'subscriptions', description: 'Subscription management' },
        { name: 'Transactions', slug: 'transactions', description: 'Transaction history' },
        { name: 'Affiliates', slug: 'affiliates', description: 'Affiliate management' },
        { name: 'Analytics', slug: 'analytics', description: 'Analytics and reports' },
        { name: 'Integrations', slug: 'integrations', description: 'Platform integrations' },
        { name: 'Audit Logs', slug: 'audit-logs', description: 'System audit logs' },
    ];

    for (const resource of resources) {
        await prisma.resource.upsert({
            where: { slug: resource.slug },
            update: {},
            create: resource,
        });
    }

    console.log('✅ Resources created');

    // ============================================
    // 3. PERMISSIONS (Resource × Action)
    // ============================================
    console.log('🔐 Creating permissions...');

    const allActions = await prisma.action.findMany();
    const allResources = await prisma.resource.findMany();

    for (const resource of allResources) {
        for (const action of allActions) {
            await prisma.permission.upsert({
                where: {
                    resourceId_actionId: {
                        resourceId: resource.id,
                        actionId: action.id,
                    },
                },
                update: {},
                create: {
                    resourceId: resource.id,
                    actionId: action.id,
                    description: `${action.name} ${resource.name}`,
                },
            });
        }
    }

    console.log('✅ Permissions created');

    // ============================================
    // 4. ROLES
    // ============================================
    console.log('👥 Creating roles...');

    const superAdminRole = await prisma.role.upsert({
        where: { slug: 'super-admin' },
        update: {},
        create: {
            name: 'Super Admin',
            slug: 'super-admin',
            description: 'Full system access',
            isSystemRole: true,
        },
    });

    const adminRole = await prisma.role.upsert({
        where: { slug: 'admin' },
        update: {},
        create: {
            name: 'Admin',
            slug: 'admin',
            description: 'Administrative access',
            isSystemRole: true,
        },
    });

    const analystRole = await prisma.role.upsert({
        where: { slug: 'analyst' },
        update: {},
        create: {
            name: 'Analyst',
            slug: 'analyst',
            description: 'Read-only analytics access',
            isSystemRole: true,
        },
    });

    console.log('✅ Roles created');

    // ============================================
    // 5. ROLE PERMISSIONS
    // ============================================
    console.log('🔗 Assigning permissions to roles...');

    const allPermissions = await prisma.permission.findMany({
        include: { resource: true, action: true },
    });

    // Super Admin: ALL permissions
    for (const permission of allPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: superAdminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: superAdminRole.id,
                permissionId: permission.id,
                granted: true,
            },
        });
    }

    // Admin: All except role/permission management
    const adminPermissions = allPermissions.filter(
        (p) =>
            p.resource.slug !== 'roles' &&
            p.resource.slug !== 'permissions' &&
            p.resource.slug !== 'audit-logs',
    );

    for (const permission of adminPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: adminRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: adminRole.id,
                permissionId: permission.id,
                granted: true,
            },
        });
    }

    // Analyst: Only READ permissions
    const analystPermissions = allPermissions.filter(
        (p) => p.action.slug === 'read' || p.action.slug === 'export',
    );

    for (const permission of analystPermissions) {
        await prisma.rolePermission.upsert({
            where: {
                roleId_permissionId: {
                    roleId: analystRole.id,
                    permissionId: permission.id,
                },
            },
            update: {},
            create: {
                roleId: analystRole.id,
                permissionId: permission.id,
                granted: true,
            },
        });
    }

    console.log('✅ Role permissions assigned');

    // ============================================
    // 6. SUPER ADMIN USER
    // ============================================
    console.log('👤 Creating super admin user...');

    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    const superAdminUser = await prisma.user.upsert({
        where: { email: 'admin@analytics.com' },
        update: {},
        create: {
            email: 'admin@analytics.com',
            passwordHash: hashedPassword,
            fullName: 'Super Admin',
            status: 'active',
            emailVerified: true,
        },
    });

    await prisma.userRole.upsert({
        where: {
            userId_roleId: {
                userId: superAdminUser.id,
                roleId: superAdminRole.id,
            },
        },
        update: {},
        create: {
            userId: superAdminUser.id,
            roleId: superAdminRole.id,
        },
    });

    console.log('✅ Super admin user created');

    // ============================================
    // 7. PLATFORMS (Phase 2)
    // ============================================
    console.log('🏪 Creating platforms...');

    const platforms = [
        {
            name: 'Stripe',
            slug: 'stripe',
            isEnabled: true,
            config: {
                description: 'Stripe payment platform',
                webhookEndpoint: '/webhooks/stripe',
                supportedCurrencies: ['USD', 'BRL', 'EUR'],
            },
        },
        {
            name: 'Hotmart',
            slug: 'hotmart',
            isEnabled: true,
            config: {
                description: 'Hotmart digital products platform',
                webhookEndpoint: '/webhooks/hotmart',
                supportedCurrencies: ['BRL', 'USD'],
            },
        },
        {
            name: 'Cartpanda',
            slug: 'cartpanda',
            isEnabled: true,
            config: {
                description: 'Cartpanda checkout platform',
                webhookEndpoint: '/webhooks/cartpanda',
                supportedCurrencies: ['BRL', 'USD'],
            },
        },
    ];

    for (const platform of platforms) {
        await prisma.platform.upsert({
            where: { slug: platform.slug },
            update: {},
            create: platform,
        });
    }

    console.log('✅ Platforms created');

    // ============================================
    // 8. PRODUCTS (Phase 3)
    // ============================================
    console.log('📦 Creating products...');

    const products = [
        {
            name: 'Holymind',
            slug: 'holymind',
            description: 'Plataforma de meditação e mindfulness com cursos e sessões guiadas',
            productType: 'subscription',
            isActive: true,
            metadata: {
                category: 'health',
                target: 'B2C',
                features: ['meditation', 'sleep', 'anxiety', 'focus'],
                targetAudience: 'adults',
            },
        },
        {
            name: 'Holyguide',
            slug: 'holyguide',
            description: 'Guia completo de desenvolvimento pessoal e espiritual',
            productType: 'subscription',
            isActive: true,
            metadata: {
                category: 'education',
                target: 'B2C',
                features: ['courses', 'ebooks', 'community', 'coaching'],
                targetAudience: 'adults',
            },
        },
        {
            name: 'Holymind Lifetime',
            slug: 'holymind-lifetime',
            description: 'Acesso vitalício à plataforma Holymind',
            productType: 'one_time',
            isActive: true,
            metadata: {
                category: 'health',
                target: 'B2C',
                features: ['meditation', 'sleep', 'anxiety', 'focus'],
                targetAudience: 'adults',
                isLifetime: true,
            },
        },
        {
            name: 'Premium Support',
            slug: 'premium-support',
            description: 'Suporte premium para clientes VIP',
            productType: 'addon',
            isActive: true,
            metadata: {
                category: 'support',
                target: 'B2C',
                features: ['priority_support', 'dedicated_manager', 'phone_support'],
                targetAudience: 'premium_customers',
            },
        },
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { slug: product.slug },
            update: {},
            create: product,
        });
    }

    console.log('✅ Products created');

    // ============================================
    // 9. OFFERS (Phase 3)
    // ============================================
    console.log('💎 Creating offers...');

    // Buscar IDs dos produtos criados
    const holymindProduct = await prisma.product.findUnique({
      where: { slug: 'holymind' },
    });

    const holyguideProduct = await prisma.product.findUnique({
      where: { slug: 'holyguide' },
    });

    const holymindLifetimeProduct = await prisma.product.findUnique({
      where: { slug: 'holymind-lifetime' },
    });

    const premiumSupportProduct = await prisma.product.findUnique({
      where: { slug: 'premium-support' },
    });

    if (holymindProduct && holyguideProduct && holymindLifetimeProduct && premiumSupportProduct) {
      const offers = [
        {
          productId: holymindProduct.id,
          name: 'Holymind Mensal',
          slug: 'holymind-mensal',
          description: 'Acesso mensal à plataforma Holymind',
          billingType: 'recurring',
          billingPeriod: 'monthly',
          billingInterval: 1,
          hasTrial: true,
          trialPeriodDays: 7,
          trialAmount: 990, // R$ 9,90
          isActive: true,
          metadata: {
            features: ['unlimited_access', 'premium_content', 'meditation_sessions'],
            limitations: ['no_download'],
            targetAudience: 'individual_users',
          },
        },
        {
          productId: holymindProduct.id,
          name: 'Holymind Anual',
          slug: 'holymind-anual',
          description: 'Acesso anual à plataforma Holymind com desconto',
          billingType: 'recurring',
          billingPeriod: 'yearly',
          billingInterval: 1,
          hasTrial: true,
          trialPeriodDays: 14,
          trialAmount: 1990, // R$ 19,90
          isActive: true,
          metadata: {
            features: ['unlimited_access', 'premium_content', 'meditation_sessions', 'exclusive_content'],
            limitations: ['no_download'],
            targetAudience: 'committed_users',
            discount: '2_months_free',
          },
        },
        {
          productId: holyguideProduct.id,
          name: 'Holyguide Mensal',
          slug: 'holyguide-mensal',
          description: 'Acesso mensal ao Holyguide',
          billingType: 'recurring',
          billingPeriod: 'monthly',
          billingInterval: 1,
          hasTrial: false,
          isActive: true,
          metadata: {
            features: ['courses', 'ebooks', 'community_access'],
            limitations: ['limited_downloads'],
            targetAudience: 'spiritual_seekers',
          },
        },
        {
          productId: holymindLifetimeProduct.id,
          name: 'Holymind Lifetime',
          slug: 'holymind-lifetime-offer',
          description: 'Acesso vitalício à plataforma Holymind',
          billingType: 'one_time',
          billingPeriod: null,
          billingInterval: 1,
          hasTrial: false,
          isActive: true,
          metadata: {
            features: ['unlimited_access', 'premium_content', 'meditation_sessions', 'exclusive_content', 'lifetime_updates'],
            limitations: [],
            targetAudience: 'lifetime_committed_users',
            isLifetime: true,
          },
        },
        {
          productId: premiumSupportProduct.id,
          name: 'Premium Support Mensal',
          slug: 'premium-support-mensal',
          description: 'Suporte premium mensal',
          billingType: 'recurring',
          billingPeriod: 'monthly',
          billingInterval: 1,
          hasTrial: false,
          isActive: true,
          metadata: {
            features: ['priority_support', 'dedicated_manager', 'phone_support', 'email_support'],
            limitations: [],
            targetAudience: 'premium_customers',
            supportLevel: 'premium',
          },
        },
      ];

      for (const offer of offers) {
        await prisma.offer.upsert({
          where: {
            productId_slug: {
              productId: offer.productId,
              slug: offer.slug,
            },
          },
          update: {},
          create: offer,
        });
      }

      console.log('✅ Offers created');
    } else {
      console.log('⚠️ Some products not found, skipping offers creation');
    }

    // ============================================
    // SUMMARY
    // ============================================
    const stats = {
        actions: await prisma.action.count(),
        resources: await prisma.resource.count(),
        permissions: await prisma.permission.count(),
        roles: await prisma.role.count(),
        users: await prisma.user.count(),
        platforms: await prisma.platform.count(),
        products: await prisma.product.count(),
        offers: await prisma.offer.count(),
    };

    console.log('📊 Seed Summary:');
    console.log(`   Actions: ${stats.actions}`);
    console.log(`   Resources: ${stats.resources}`);
    console.log(`   Permissions: ${stats.permissions}`);
    console.log(`   Roles: ${stats.roles}`);
    console.log(`   Users: ${stats.users}`);
    console.log(`   Platforms: ${stats.platforms}`);
    console.log(`   Products: ${stats.products}`);
    console.log(`   Offers: ${stats.offers}`);
    console.log('');
    console.log('✅ Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Error during seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
