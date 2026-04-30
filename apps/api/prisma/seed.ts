import { PrismaClient, MonitorStatus, MonitorType, IncidentStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  await prisma.incident.deleteMany();
  await prisma.checkResult.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash('123456', 10);

  const organization = await prisma.organization.create({
    data: {
      name: 'Monitor Dinan',
      slug: 'monitor-dinan',
    },
  });

  const user = await prisma.user.create({
    data: {
      name: 'Lucía Admin',
      email: 'lucia@demo.com',
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
    },
  });

  const now = new Date();

  const monitors = await prisma.monitor.createManyAndReturn({
    data: [
      {
        name: 'Web corporativa',
        type: MonitorType.HTTPS,
        target: 'https://dinaninformatica.es',
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        currentStatus: MonitorStatus.UP,
        lastResponseTime: 184,
        lastCheckedAt: new Date(now.getTime() - 2 * 60 * 1000),
        nextCheckAt: new Date(now.getTime() + 60 * 1000),
        isActive: true,
        organizationId: organization.id,
        createdById: user.id,
        locations: ['Madrid', 'Sevilla'],
        alertEmail: true,
        alertPush: true,
        alertThreshold: 3,
      },
      {
        name: 'API clientes',
        type: MonitorType.HTTPS,
        target: 'https://api.dinaninformatica.es/health',
        expectedStatusCode: 200,
        frequencySeconds: 30,
        timeoutSeconds: 8,
        currentStatus: MonitorStatus.DOWN,
        lastResponseTime: null,
        lastCheckedAt: new Date(now.getTime() - 1 * 60 * 1000),
        nextCheckAt: new Date(now.getTime() + 30 * 1000),
        isActive: true,
        organizationId: organization.id,
        createdById: user.id,
        locations: ['Madrid', 'Barcelona'],
        alertEmail: true,
        alertPush: true,
        alertThreshold: 2,
      },
      {
        name: 'Panel interno',
        type: MonitorType.HTTPS,
        target: 'https://panel.dinaninformatica.es',
        expectedStatusCode: 200,
        frequencySeconds: 120,
        timeoutSeconds: 12,
        currentStatus: MonitorStatus.UP,
        lastResponseTime: 326,
        lastCheckedAt: new Date(now.getTime() - 5 * 60 * 1000),
        nextCheckAt: new Date(now.getTime() + 2 * 60 * 1000),
        isActive: true,
        organizationId: organization.id,
        createdById: user.id,
        locations: ['Sevilla'],
        alertEmail: true,
        alertPush: false,
        alertThreshold: 3,
      },
      {
        name: 'Servidor legacy HTTP',
        type: MonitorType.HTTP,
        target: 'http://legacy.dinaninformatica.es',
        expectedStatusCode: 200,
        frequencySeconds: 300,
        timeoutSeconds: 15,
        currentStatus: MonitorStatus.UNKNOWN,
        lastResponseTime: null,
        lastCheckedAt: null,
        nextCheckAt: now,
        isActive: true,
        organizationId: organization.id,
        createdById: user.id,
        locations: ['Default'],
        alertEmail: false,
        alertPush: false,
        alertThreshold: 5,
      },
      {
        name: 'Servicio pausado de pruebas',
        type: MonitorType.HTTPS,
        target: 'https://test.dinaninformatica.es',
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        currentStatus: MonitorStatus.UNKNOWN,
        lastResponseTime: null,
        lastCheckedAt: null,
        nextCheckAt: now,
        isActive: false,
        organizationId: organization.id,
        createdById: user.id,
        locations: [],
        alertEmail: false,
        alertPush: false,
        alertThreshold: 3,
      },
    ],
  });

  for (const monitor of monitors) {
    await prisma.checkResult.createMany({
      data: [
        {
          monitorId: monitor.id,
          status: monitor.currentStatus === MonitorStatus.DOWN ? MonitorStatus.DOWN : MonitorStatus.UP,
          responseTimeMs: monitor.currentStatus === MonitorStatus.DOWN ? null : 210,
          statusCode: monitor.currentStatus === MonitorStatus.DOWN ? null : 200,
          errorMessage: monitor.currentStatus === MonitorStatus.DOWN ? 'Timeout al conectar con el servicio' : null,
          location: 'Madrid',
          checkedAt: new Date(now.getTime() - 30 * 60 * 1000),
        },
        {
          monitorId: monitor.id,
          status: monitor.currentStatus === MonitorStatus.DOWN ? MonitorStatus.DOWN : MonitorStatus.UP,
          responseTimeMs: monitor.currentStatus === MonitorStatus.DOWN ? null : 245,
          statusCode: monitor.currentStatus === MonitorStatus.DOWN ? 500 : 200,
          errorMessage: monitor.currentStatus === MonitorStatus.DOWN ? 'Respuesta HTTP 500' : null,
          location: 'Sevilla',
          checkedAt: new Date(now.getTime() - 15 * 60 * 1000),
        },
        {
          monitorId: monitor.id,
          status: monitor.currentStatus,
          responseTimeMs: monitor.lastResponseTime,
          statusCode: monitor.currentStatus === MonitorStatus.UP ? 200 : null,
          errorMessage: monitor.currentStatus === MonitorStatus.DOWN ? 'Servicio no disponible' : null,
          location: 'Barcelona',
          checkedAt: new Date(now.getTime() - 5 * 60 * 1000),
        },
      ],
    });
  }

  const apiMonitor = monitors.find((m) => m.name === 'API clientes');
  const webMonitor = monitors.find((m) => m.name === 'Web corporativa');

  if (apiMonitor) {
    await prisma.incident.create({
      data: {
        monitorId: apiMonitor.id,
        status: IncidentStatus.OPEN,
        title: 'API clientes no responde',
        startedAt: new Date(now.getTime() - 45 * 60 * 1000),
      },
    });
  }

  if (webMonitor) {
    await prisma.incident.create({
      data: {
        monitorId: webMonitor.id,
        status: IncidentStatus.RESOLVED,
        title: 'Caída temporal de la web corporativa',
        startedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
        resolvedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        durationSeconds: 3600,
      },
    });
  }

  console.log('✅ Seed completado');
  console.log('Usuario demo: lucia@demo.com');
  console.log('Contraseña: 123456');
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });