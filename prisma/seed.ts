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
    console.log('');
    console.log('📧 Email: admin@analytics.com');
    console.log('🔑 Password: Admin@123');
    console.log('');

    // ============================================
    // SUMMARY
    // ============================================
    const stats = {
        actions: await prisma.action.count(),
        resources: await prisma.resource.count(),
        permissions: await prisma.permission.count(),
        roles: await prisma.role.count(),
        users: await prisma.user.count(),
    };

    console.log('📊 Seed Summary:');
    console.log(`   Actions: ${stats.actions}`);
    console.log(`   Resources: ${stats.resources}`);
    console.log(`   Permissions: ${stats.permissions}`);
    console.log(`   Roles: ${stats.roles}`);
    console.log(`   Users: ${stats.users}`);
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
