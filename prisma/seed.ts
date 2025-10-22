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
        { name: 'Sync', slug: 'sync', description: 'Synchronization jobs' },
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
    // 10. CORE BUSINESS DATA (Phase 4)
    // ============================================
    console.log('👥 Creating customers...');

    const stripePlatform = await prisma.platform.findFirst({ where: { slug: 'stripe' } });
    const hotmartPlatform = await prisma.platform.findFirst({ where: { slug: 'hotmart' } });
    const holymindProductCore = await prisma.product.findFirst({ where: { slug: 'holymind' } });
    const holyguideProductCore = await prisma.product.findFirst({ where: { slug: 'holyguide' } });

    if (stripePlatform && hotmartPlatform && holymindProductCore && holyguideProductCore) {
      // Create test customers
      const customers = [
        {
          platformId: stripePlatform.id,
          externalCustomerId: 'cus_stripe_test_001',
          email: 'joao.silva@example.com',
          name: 'João Silva',
          phone: '+5511999999999',
          document: '12345678900',
          documentType: 'cpf',
          countryCode: 'BR',
          state: 'SP',
          city: 'São Paulo',
          firstPurchaseAt: new Date('2024-01-15'),
          lastPurchaseAt: new Date('2024-01-15'),
          totalSpentBrl: 97.00,
          metadata: {
            source: 'website',
            utm_campaign: 'summer_sale',
            preferences: ['meditation', 'sleep'],
          },
        },
        {
          platformId: hotmartPlatform.id,
          externalCustomerId: 'cus_hotmart_test_001',
          email: 'maria.santos@example.com',
          name: 'Maria Santos',
          phone: '+5511888888888',
          document: '98765432100',
          documentType: 'cpf',
          countryCode: 'BR',
          state: 'RJ',
          city: 'Rio de Janeiro',
          firstPurchaseAt: new Date('2024-02-10'),
          lastPurchaseAt: new Date('2024-02-10'),
          totalSpentBrl: 197.00,
          metadata: {
            source: 'facebook_ads',
            utm_campaign: 'spiritual_growth',
            preferences: ['courses', 'ebooks'],
          },
        },
      ];

      for (const customerData of customers) {
        await prisma.customer.upsert({
          where: {
            unique_platform_customer: {
              platformId: customerData.platformId,
              externalCustomerId: customerData.externalCustomerId,
            },
          },
          update: {},
          create: customerData,
        });
      }

      console.log('✅ Customers created');

      // Create test subscriptions
      console.log('📋 Creating subscriptions...');

      const joaoCustomer = await prisma.customer.findFirst({
        where: { externalCustomerId: 'cus_stripe_test_001' },
      });

      const mariaCustomer = await prisma.customer.findFirst({
        where: { externalCustomerId: 'cus_hotmart_test_001' },
      });

      if (joaoCustomer && mariaCustomer) {
        const subscriptions = [
          {
            platformId: stripePlatform.id,
            externalSubscriptionId: 'sub_stripe_test_001',
            customerId: joaoCustomer.id,
            productId: holymindProductCore.id,
            externalCustomerId: joaoCustomer.externalCustomerId,
            externalProductId: 'prod_holymind_stripe',
            status: 'active',
            isTrial: false,
            recurringAmount: 29.90,
            currency: 'BRL',
            recurringAmountBrl: 29.90,
            recurringAmountUsd: 5.98,
            exchangeRate: 5.00,
            billingPeriod: 'month',
            billingCycles: null,
            startDate: new Date('2024-01-15'),
            nextBillingDate: new Date('2024-02-15'),
            currentPeriodStart: new Date('2024-01-15'),
            currentPeriodEnd: new Date('2024-02-15'),
            platformMetadata: {
              stripe_subscription_id: 'sub_stripe_test_001',
              stripe_customer_id: 'cus_stripe_test_001',
              stripe_price_id: 'price_holymind_monthly',
            },
          },
          {
            platformId: hotmartPlatform.id,
            externalSubscriptionId: 'sub_hotmart_test_001',
            customerId: mariaCustomer.id,
            productId: holyguideProductCore.id,
            externalCustomerId: mariaCustomer.externalCustomerId,
            externalProductId: 'prod_holyguide_hotmart',
            status: 'active',
            isTrial: false,
            recurringAmount: 49.90,
            currency: 'BRL',
            recurringAmountBrl: 49.90,
            recurringAmountUsd: 9.98,
            exchangeRate: 5.00,
            billingPeriod: 'month',
            billingCycles: null,
            startDate: new Date('2024-02-10'),
            nextBillingDate: new Date('2024-03-10'),
            currentPeriodStart: new Date('2024-02-10'),
            currentPeriodEnd: new Date('2024-03-10'),
            platformMetadata: {
              hotmart_subscription_id: 'sub_hotmart_test_001',
              hotmart_customer_id: 'cus_hotmart_test_001',
              hotmart_product_id: 'prod_holyguide_hotmart',
            },
          },
        ];

        for (const subscriptionData of subscriptions) {
          await prisma.subscription.upsert({
            where: {
              unique_platform_subscription: {
                platformId: subscriptionData.platformId,
                externalSubscriptionId: subscriptionData.externalSubscriptionId,
              },
            },
            update: {},
            create: subscriptionData,
          });
        }

        console.log('✅ Subscriptions created');

        // Create test transactions
        console.log('💳 Creating transactions...');

        const joaoSubscription = await prisma.subscription.findFirst({
          where: { externalSubscriptionId: 'sub_stripe_test_001' },
        });

        const mariaSubscription = await prisma.subscription.findFirst({
          where: { externalSubscriptionId: 'sub_hotmart_test_001' },
        });

        if (joaoSubscription && mariaSubscription) {
          const transactions = [
            {
              platformId: stripePlatform.id,
              externalTransactionId: 'txn_stripe_test_001',
              externalInvoiceId: 'inv_stripe_test_001',
              customerId: joaoCustomer.id,
              transactionType: 'payment',
              status: 'succeeded',
              grossAmount: 29.90,
              discountAmount: 0,
              taxAmount: 0,
              feeAmount: 1.50,
              netAmount: 28.40,
              currency: 'BRL',
              grossAmountBrl: 29.90,
              discountAmountBrl: 0,
              taxAmountBrl: 0,
              feeAmountBrl: 1.50,
              netAmountBrl: 28.40,
              grossAmountUsd: 5.98,
              discountAmountUsd: 0,
              taxAmountUsd: 0,
              feeAmountUsd: 0.30,
              netAmountUsd: 5.68,
              exchangeRate: 5.00,
              paymentMethod: 'credit_card',
              paymentMethodDetails: {
                card_brand: 'visa',
                card_last4: '4242',
                card_exp_month: 12,
                card_exp_year: 2025,
              },
              transactionDate: new Date('2024-01-15T10:30:00Z'),
              platformMetadata: {
                stripe_payment_intent_id: 'pi_stripe_test_001',
                stripe_charge_id: 'ch_stripe_test_001',
              },
            },
            {
              platformId: hotmartPlatform.id,
              externalTransactionId: 'txn_hotmart_test_001',
              externalInvoiceId: 'inv_hotmart_test_001',
              customerId: mariaCustomer.id,
              transactionType: 'payment',
              status: 'succeeded',
              grossAmount: 49.90,
              discountAmount: 0,
              taxAmount: 0,
              feeAmount: 2.50,
              netAmount: 47.40,
              currency: 'BRL',
              grossAmountBrl: 49.90,
              discountAmountBrl: 0,
              taxAmountBrl: 0,
              feeAmountBrl: 2.50,
              netAmountBrl: 47.40,
              grossAmountUsd: 9.98,
              discountAmountUsd: 0,
              taxAmountUsd: 0,
              feeAmountUsd: 0.50,
              netAmountUsd: 9.48,
              exchangeRate: 5.00,
              paymentMethod: 'pix',
              paymentMethodDetails: {
                pix_type: 'static_qr_code',
                pix_provider: 'hotmart',
              },
              transactionDate: new Date('2024-02-10T14:20:00Z'),
              platformMetadata: {
                hotmart_transaction_id: 'txn_hotmart_test_001',
                hotmart_purchase_id: 'pur_hotmart_test_001',
              },
            },
          ];

          for (const transactionData of transactions) {
            await prisma.transaction.upsert({
              where: {
                unique_platform_transaction: {
                  platformId: transactionData.platformId,
                  externalTransactionId: transactionData.externalTransactionId,
                },
              },
              update: {},
              create: transactionData,
            });
          }

          // Link transactions to subscriptions
          const joaoTransaction = await prisma.transaction.findFirst({
            where: { externalTransactionId: 'txn_stripe_test_001' },
          });

          const mariaTransaction = await prisma.transaction.findFirst({
            where: { externalTransactionId: 'txn_hotmart_test_001' },
          });

          if (joaoTransaction && mariaTransaction) {
            await prisma.transactionSubscription.create({
              data: {
                transactionId: joaoTransaction.id,
                subscriptionId: joaoSubscription.id,
                amountAllocatedBrl: 28.40,
              },
            });

            await prisma.transactionSubscription.create({
              data: {
                transactionId: mariaTransaction.id,
                subscriptionId: mariaSubscription.id,
                amountAllocatedBrl: 47.40,
              },
            });
          }

          console.log('✅ Transactions created');
        }
      }
    } else {
      console.log('⚠️ Required platforms or products not found, skipping core business data creation');
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
        customers: await prisma.customer.count(),
        subscriptions: await prisma.subscription.count(),
        transactions: await prisma.transaction.count(),
        orders: await prisma.order.count(),
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
    console.log(`   Customers: ${stats.customers}`);
    console.log(`   Subscriptions: ${stats.subscriptions}`);
    console.log(`   Transactions: ${stats.transactions}`);
    console.log(`   Orders: ${stats.orders}`);
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
