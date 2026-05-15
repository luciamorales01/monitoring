// prisma/seed.ts

import {
  PrismaClient,
  MonitorStatus,
  MonitorType,
  UserRole,
  IncidentSeverity,
  IncidentStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const passwordPlain = 'Admin1234!';

async function main() {
  console.log('🌱 Iniciando seed...');

  await prisma.notificationEvent.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.checkResult.deleteMany();
  await prisma.sectionMonitor.deleteMany();
  await prisma.sectionMember.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.section.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.userInvitation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const passwordHash = await bcrypt.hash(passwordPlain, 10);

  const organization = await prisma.organization.create({
    data: {
      name: 'Monitoring Demo',
      slug: 'monitoring-demo',
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: 'Lucía Morales',
      email: 'luciamoralesalv1@gmail.com',
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
      phone: '600000000',
      timezone: 'Europe/Madrid',
    },
  });

  const users = await Promise.all(
    [
      ['Sofía Soporte', 'sofia.soporte@demo.com', UserRole.VIEWER],
      ['Carlos DevOps', 'carlos.devops@demo.com', UserRole.ADMIN],
      ['Marta Infraestructura', 'marta.infra@demo.com', UserRole.VIEWER],
      ['Alejandro Sistemas', 'alejandro.sistemas@demo.com', UserRole.VIEWER],
      ['Laura QA', 'laura.qa@demo.com', UserRole.VIEWER],
    ].map(([name, email, role]) =>
      prisma.user.create({
        data: {
          name: String(name),
          email: String(email),
          passwordHash,
          role: role as UserRole,
          organizationId: organization.id,
        },
      }),
    ),
  );

  const sections = await Promise.all(
    [
      {
        name: 'Frontend',
        description: 'Web principal, login, dashboard y paneles de usuario',
        icon: 'layout-dashboard',
        locations: ['madrid', 'paris'],
      },
      {
        name: 'Backend',
        description: 'API NestJS, autenticación, informes y lógica de negocio',
        icon: 'server',
        locations: ['madrid'],
      },
      {
        name: 'Infraestructura',
        description: 'Servidores, puertos, DNS, SSL y servicios críticos',
        icon: 'network',
        locations: ['madrid', 'london'],
      },
      {
        name: 'Bases de Datos',
        description: 'PostgreSQL, Supabase y servicios de persistencia',
        icon: 'database',
        locations: ['madrid'],
      },
      {
        name: 'APIs externas',
        description: 'Servicios externos usados por la plataforma',
        icon: 'plug',
        locations: ['paris', 'london'],
      },
      {
        name: 'Producción',
        description: 'Monitores críticos de entorno productivo',
        icon: 'shield-check',
        locations: ['madrid', 'paris', 'london'],
      },
    ].map((section) =>
      prisma.section.create({
        data: {
          ...section,
          organizationId: organization.id,
          frequencySeconds: 60,
          timeoutSeconds: 10,
          expectedStatusCode: 200,
          isActive: true,
        },
      }),
    ),
  );

  for (const section of sections) {
    await prisma.sectionMember.create({
      data: {
        sectionId: section.id,
        userId: admin.id,
      },
    });
  }

  for (const user of users) {
    await prisma.sectionMember.create({
      data: {
        sectionId: sections[Math.floor(Math.random() * sections.length)].id,
        userId: user.id,
      },
    });
  }

  const monitorTypes = [
    MonitorType.HTTP,
    MonitorType.HTTPS,
    MonitorType.SSL,
    MonitorType.TCP,
    MonitorType.DNS,
  ];

  const targetsByType: Record<MonitorType, string[]> = {
    HTTP: [
      'http://example.com',
      'http://neverssl.com',
      'http://httpstat.us/200',
    ],
    HTTPS: [
      'https://google.com',
      'https://github.com',
      'https://openai.com',
      'https://supabase.com',
      'https://vercel.com',
    ],
    SSL: [
      'google.com',
      'github.com',
      'openai.com',
      'supabase.com',
      'vercel.com',
    ],
    TCP: [
      'google.com',
      'github.com',
      'cloudflare.com',
      '1.1.1.1',
      '8.8.8.8',
    ],
    DNS: [
      'google.com',
      'github.com',
      'openai.com',
      'supabase.com',
      'cloudflare.com',
    ],
  };

  for (let i = 1; i <= 50; i++) {
    const type = monitorTypes[i % monitorTypes.length];
    const section = sections[i % sections.length];

    const isDown = i % 10 === 0;
    const isUnknown = i % 13 === 0;

    const currentStatus = isDown
      ? MonitorStatus.DOWN
      : isUnknown
        ? MonitorStatus.UNKNOWN
        : MonitorStatus.UP;

    const targetList = targetsByType[type];

    const monitor = await prisma.monitor.create({
      data: {
        name: `${type} Monitor ${i}`,
        type,
        target: targetList[i % targetList.length],

        expectedStatusCode:
          type === MonitorType.HTTP || type === MonitorType.HTTPS ? 200 : 0,

        frequencySeconds: [60, 120, 300][i % 3],
        timeoutSeconds: [5, 10, 15][i % 3],

        currentStatus,
        lastResponseTime: currentStatus === MonitorStatus.UP ? 80 + i * 6 : null,
        lastCheckedAt: new Date(Date.now() - i * 60 * 1000),
        nextCheckAt: new Date(Date.now() + i * 60 * 1000),

        isActive: i % 17 !== 0,
        usesSectionSchedule: i % 4 !== 0,

        organizationId: organization.id,
        createdById: admin.id,

        alertEmail: true,
        alertThreshold: [2, 3, 5][i % 3],

        tcpPort: type === MonitorType.TCP ? [80, 443, 5432, 6379][i % 4] : null,
        sslWarningDays: type === MonitorType.SSL ? [7, 14, 30][i % 3] : 14,
        dnsRecordType: type === MonitorType.DNS ? ['A', 'AAAA', 'CNAME', 'MX'][i % 4] : 'A',
        dnsExpectedValue:
          type === MonitorType.DNS && i % 2 === 0 ? '142.250.184.14' : null,
      },
    });

    await prisma.sectionMonitor.create({
      data: {
        sectionId: section.id,
        monitorId: monitor.id,
      },
    });

    for (let j = 0; j < 12; j++) {
      const checkStatus =
        j === 0
          ? currentStatus
          : Math.random() > 0.15
            ? MonitorStatus.UP
            : MonitorStatus.DOWN;

      await prisma.checkResult.create({
        data: {
          monitorId: monitor.id,
          status: checkStatus,
          responseTimeMs:
            checkStatus === MonitorStatus.UP
              ? Math.floor(70 + Math.random() * 600)
              : null,
          statusCode:
            type === MonitorType.HTTP || type === MonitorType.HTTPS
              ? checkStatus === MonitorStatus.UP
                ? 200
                : 500
              : null,
          errorMessage:
            checkStatus === MonitorStatus.DOWN
              ? 'Timeout al comprobar el monitor'
              : null,
          location: ['madrid', 'paris', 'london', 'default'][j % 4],
          checkedAt: new Date(Date.now() - j * 5 * 60 * 1000),
        },
      });
    }

    if (currentStatus === MonitorStatus.DOWN) {
      const incident = await prisma.incident.create({
        data: {
          monitorId: monitor.id,
          status: IncidentStatus.OPEN,
          severity:
            i % 20 === 0
              ? IncidentSeverity.CRITICAL
              : IncidentSeverity.HIGH,
          title: `${monitor.name} caído`,
          startedAt: new Date(Date.now() - i * 10 * 60 * 1000),
          lastStatusChangeAt: new Date(),
          rootCause: 'Simulado para pruebas del seed',
        },
      });

      await prisma.notificationEvent.create({
        data: {
          monitorId: monitor.id,
          incidentId: incident.id,
          type: 'MONITOR_DOWN',
          status: 'SENT',
          recipient: admin.email,
          subject: `Alerta: ${monitor.name} caído`,
          sentAt: new Date(),
        },
      });
    }
  }

  console.log('✅ Seed completado');
  console.log(`Admin: luciamoralesalv1@gmail.com`);
  console.log(`Password: ${passwordPlain}`);
}

main()
  .catch((error) => {
    console.error('❌ Error ejecutando seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });