import { PrismaClient, UserRole, MonitorType, MonitorStatus, IncidentStatus, IncidentSeverity } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PASSWORD = 'Admin1234!';

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

async function main() {
  console.log('Limpiando base de datos...');

  await prisma.notificationEvent.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.checkResult.deleteMany();
  await prisma.sectionMonitor.deleteMany();
  await prisma.sectionMember.deleteMany();
  await prisma.section.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userInvitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const organization = await prisma.organization.create({
    data: {
      name: 'Monitoring Demo',
      slug: 'monitoring-demo',
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: 'Lucía Morales',
      email: 'luciamoralesalv1@gmail.com',
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
      phone: '+34 600 000 000',
      timezone: 'Europe/Madrid',
      status: 'ACTIVE',
      lastLoginAt: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Admin Demo',
      email: 'admin@monitoring.local',
      passwordHash,
      role: UserRole.ADMIN,
      organizationId: organization.id,
      status: 'ACTIVE',
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: 'Usuario Demo',
      email: 'viewer@monitoring.local',
      passwordHash,
      role: UserRole.VIEWER,
      organizationId: organization.id,
      status: 'ACTIVE',
    },
  });

  const ecommerce = await prisma.section.create({
    data: {
      name: 'E-commerce',
      description: 'Monitores relacionados con tienda online y servicios comerciales.',
      icon: 'shopping-cart',
      organizationId: organization.id,
      expectedStatusCode: 200,
      frequencySeconds: 60,
      timeoutSeconds: 10,
      isActive: true,
    },
  });

  const corporativa = await prisma.section.create({
    data: {
      name: 'Web corporativa',
      description: 'Monitores de páginas públicas corporativas.',
      icon: 'globe',
      organizationId: organization.id,
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      isActive: true,
    },
  });

  const soporte = await prisma.section.create({
    data: {
      name: 'Soporte',
      description: 'Servicios de ayuda, documentación y atención al cliente.',
      icon: 'headphones',
      organizationId: organization.id,
      expectedStatusCode: 200,
      frequencySeconds: 180,
      timeoutSeconds: 15,
      isActive: true,
    },
  });

  await prisma.sectionMember.createMany({
    data: [
      { sectionId: ecommerce.id, userId: owner.id },
      { sectionId: ecommerce.id, userId: admin.id },
      { sectionId: corporativa.id, userId: owner.id },
      { sectionId: corporativa.id, userId: viewer.id },
      { sectionId: soporte.id, userId: owner.id },
      { sectionId: soporte.id, userId: admin.id },
      { sectionId: soporte.id, userId: viewer.id },
    ],
  });

  const monitorSeeds = [
    {
      name: 'Web principal',
      type: MonitorType.HTTPS,
      target: 'https://example.com',
      status: MonitorStatus.UP,
      sectionId: corporativa.id,
      responseTime: 184,
    },
    {
      name: 'Landing corporativa',
      type: MonitorType.HTTPS,
      target: 'https://www.iana.org',
      status: MonitorStatus.UP,
      sectionId: corporativa.id,
      responseTime: 231,
    },
    {
      name: 'Tienda online',
      type: MonitorType.HTTPS,
      target: 'https://example.com/shop',
      status: MonitorStatus.UP,
      sectionId: ecommerce.id,
      responseTime: 315,
    },
    {
      name: 'Panel de clientes',
      type: MonitorType.HTTPS,
      target: 'https://example.com/clientes',
      status: MonitorStatus.DOWN,
      sectionId: ecommerce.id,
      responseTime: null,
    },
    {
      name: 'API pública',
      type: MonitorType.HTTPS,
      target: 'https://example.com/api/health',
      status: MonitorStatus.DOWN,
      sectionId: soporte.id,
      responseTime: null,
    },
    {
      name: 'Documentación',
      type: MonitorType.HTTPS,
      target: 'https://developer.mozilla.org',
      status: MonitorStatus.UP,
      sectionId: soporte.id,
      responseTime: 289,
    },
    {
      name: 'Servicio HTTP legacy',
      type: MonitorType.HTTP,
      target: 'http://neverssl.com',
      status: MonitorStatus.UP,
      sectionId: corporativa.id,
      responseTime: 142,
    },
    {
      name: 'Portal antiguo',
      type: MonitorType.HTTP,
      target: 'http://example.com',
      status: MonitorStatus.UP,
      sectionId: soporte.id,
      responseTime: 198,
    },
  ];

  for (const seed of monitorSeeds) {
    const monitor = await prisma.monitor.create({
      data: {
        name: seed.name,
        type: seed.type,
        target: seed.target,
        expectedStatusCode: 200,
        frequencySeconds: 60,
        timeoutSeconds: 10,
        currentStatus: seed.status,
        lastResponseTime: seed.responseTime,
        lastCheckedAt: minutesAgo(2),
        nextCheckAt: new Date(Date.now() + 60 * 1000),
        isActive: true,
        usesSectionSchedule: true,
        alertEmail: true,
        alertThreshold: 3,
        organizationId: organization.id,
        createdById: owner.id,
      },
    });

    await prisma.sectionMonitor.create({
      data: {
        sectionId: seed.sectionId,
        monitorId: monitor.id,
      },
    });

    const checks = Array.from({ length: 12 }).map((_, index) => {
      const isDown = seed.status === MonitorStatus.DOWN && index >= 9;

      return {
        monitorId: monitor.id,
        status: isDown ? MonitorStatus.DOWN : MonitorStatus.UP,
        responseTimeMs: isDown ? null : Math.max(80, (seed.responseTime ?? 250) + Math.floor(Math.random() * 60 - 30)),
        statusCode: isDown ? 500 : 200,
        errorMessage: isDown ? 'El servicio no respondió correctamente.' : null,
        checkedAt: minutesAgo((12 - index) * 10),
      };
    });

    await prisma.checkResult.createMany({
      data: checks,
    });

    if (seed.status === MonitorStatus.DOWN) {
      const incident = await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          status: IncidentStatus.OPEN,
          severity: IncidentSeverity.HIGH,
          title: `${seed.name} no está disponible`,
          startedAt: minutesAgo(35),
          lastStatusChangeAt: minutesAgo(35),
          rootCause: 'Error detectado durante la comprobación automática.',
        },
      });

      await prisma.notificationEvent.create({
        data: {
          monitorId: monitor.id,
          incidentId: incident.id,
          type: 'MONITOR_DOWN',
          channel: 'EMAIL',
          status: 'PENDING',
          recipient: owner.email,
          subject: `Alerta: ${seed.name} está caído`,
        },
      });
    }
  }

  console.log('Seed completado correctamente.');
  console.log('');
  console.log('Usuario OWNER:');
  console.log('Email: lucia@monitoring.local');
  console.log(`Contraseña: ${PASSWORD}`);
  console.log('');
  console.log('Usuario ADMIN:');
  console.log('Email: admin@monitoring.local');
  console.log(`Contraseña: ${PASSWORD}`);
  console.log('');
  console.log('Usuario VIEWER:');
  console.log('Email: viewer@monitoring.local');
  console.log(`Contraseña: ${PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });