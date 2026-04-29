import {
  PrismaClient,
  MonitorStatus,
  MonitorType,
  UserRole,
  IncidentStatus,
  type Monitor,
} from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log('🌱 Limpiando base de datos...');

  await prisma.incident.deleteMany();
  await prisma.checkResult.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  console.log('🏢 Creando organización...');

  const organization = await prisma.organization.create({
    data: {
      name: 'Monitoring TFG',
      slug: 'monitoring-tfg',
    },
  });

  const passwordHash = await hash('123456', 10);

  console.log('👤 Creando usuarios...');

  const owner = await prisma.user.create({
    data: {
      name: 'Ana Sánchez',
      email: 'admin@monitoring.com',
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'José Martínez',
      email: 'admin2@monitoring.com',
      passwordHash,
      role: UserRole.ADMIN,
      organizationId: organization.id,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Laura Méndez',
      email: 'viewer@monitoring.com',
      passwordHash,
      role: UserRole.VIEWER,
      organizationId: organization.id,
    },
  });

  console.log('🌐 Creando monitores...');

  const monitorSeeds = [
    {
      name: 'Google',
      target: 'https://google.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UP,
      lastResponseTime: 337,
      createdById: owner.id,
    },
    {
      name: 'ZARA',
      target: 'https://www.zara.com/es/',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UP,
      lastResponseTime: 411,
      createdById: owner.id,
    },
    {
      name: 'Dinan Informática',
      target: 'https://dinaninformatica.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UP,
      lastResponseTime: 512,
      createdById: admin.id,
    },
    {
      name: 'API interna',
      target: 'https://api.miempresa.com/health',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.DOWN,
      lastResponseTime: 1842,
      createdById: admin.id,
    },
    {
      name: 'Tienda online',
      target: 'https://tienda.miempresa.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.DOWN,
      lastResponseTime: null,
      createdById: owner.id,
    },
    {
      name: 'Blog corporativo',
      target: 'https://blog.miempresa.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UP,
      lastResponseTime: 873,
      createdById: viewer.id,
    },
    {
      name: 'Panel cliente',
      target: 'https://panel.miempresa.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UP,
      lastResponseTime: 659,
      createdById: owner.id,
    },
    {
      name: 'Docs',
      target: 'https://docs.miempresa.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UP,
      lastResponseTime: 305,
      createdById: admin.id,
    },
    {
      name: 'Status Page',
      target: 'https://status.miempresa.com',
      type: MonitorType.HTTPS,
      currentStatus: MonitorStatus.UNKNOWN,
      lastResponseTime: null,
      createdById: owner.id,
      isActive: false,
    },
    {
      name: 'Legacy HTTP',
      target: 'http://legacy.miempresa.com',
      type: MonitorType.HTTP,
      currentStatus: MonitorStatus.UNKNOWN,
      lastResponseTime: null,
      createdById: viewer.id,
      isActive: false,
    },
  ];

  const monitors: Monitor[] = [];

  for (const seed of monitorSeeds) {
    const monitor = await prisma.monitor.create({
      data: {
        name: seed.name,
        target: seed.target,
        type: seed.type,
        currentStatus: seed.currentStatus,
        lastResponseTime: seed.lastResponseTime,
        lastCheckedAt: seed.currentStatus === MonitorStatus.UNKNOWN ? null : minutesAgo(1),
        nextCheckAt: new Date(),
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        isActive: seed.isActive ?? true,
        organizationId: organization.id,
        createdById: seed.createdById,
      },
    });

    monitors.push(monitor);
  }

  console.log('📊 Creando histórico de checks...');

  for (const monitor of monitors) {
    const isDownMonitor = monitor.currentStatus === MonitorStatus.DOWN;
    const isPaused = !monitor.isActive;

    for (let i = 50; i >= 1; i--) {
      const checkedAt = minutesAgo(i * 10);

      let status: MonitorStatus = MonitorStatus.UP;
      let responseTimeMs: number | null = 250 + Math.floor(Math.random() * 700);
      let statusCode: number | null = 200;
      let errorMessage: string | null = null;

      if (isPaused) {
        status = MonitorStatus.UNKNOWN;
        responseTimeMs = null;
        statusCode = null;
        errorMessage = 'Monitor paused';
      } else if (isDownMonitor && i <= 18) {
        status = MonitorStatus.DOWN;
        responseTimeMs = 1500 + Math.floor(Math.random() * 900);
        statusCode = monitor.name.includes('API') ? 502 : null;
        errorMessage = monitor.name.includes('API') ? 'Bad Gateway' : 'fetch failed';
      } else if (Math.random() < 0.08) {
        status = MonitorStatus.DOWN;
        responseTimeMs = 1200 + Math.floor(Math.random() * 800);
        statusCode = 500;
        errorMessage = 'Temporary server error';
      }

      await prisma.checkResult.create({
        data: {
          monitorId: monitor.id,
          status,
          responseTimeMs,
          statusCode,
          errorMessage,
          checkedAt,
        },
      });
    }
  }

  console.log('🚨 Creando incidencias...');

  const apiMonitor = monitors.find((m) => m.name === 'API interna');
  const shopMonitor = monitors.find((m) => m.name === 'Tienda online');
  const blogMonitor = monitors.find((m) => m.name === 'Blog corporativo');
  const docsMonitor = monitors.find((m) => m.name === 'Docs');

  if (apiMonitor) {
    await prisma.incident.create({
      data: {
        monitorId: apiMonitor.id,
        status: IncidentStatus.OPEN,
        title: 'Error 502 - Bad Gateway',
        startedAt: minutesAgo(180),
      },
    });
  }

  if (shopMonitor) {
    await prisma.incident.create({
      data: {
        monitorId: shopMonitor.id,
        status: IncidentStatus.OPEN,
        title: 'Monitor caído',
        startedAt: minutesAgo(95),
      },
    });
  }

  if (blogMonitor) {
    await prisma.incident.create({
      data: {
        monitorId: blogMonitor.id,
        status: IncidentStatus.RESOLVED,
        title: 'Alta latencia detectada',
        startedAt: daysAgo(1),
        resolvedAt: minutesAgo(480),
        durationSeconds: 3600,
      },
    });
  }

  if (docsMonitor) {
    await prisma.incident.create({
      data: {
        monitorId: docsMonitor.id,
        status: IncidentStatus.RESOLVED,
        title: 'Mantenimiento programado',
        startedAt: daysAgo(2),
        resolvedAt: daysAgo(2),
        durationSeconds: 5400,
      },
    });
  }

  console.log('✅ Seed completado');
  console.log('');
  console.log('Login de prueba:');
  console.log('Email: admin@monitoring.com');
  console.log('Password: 123456');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });