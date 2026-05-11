import { PrismaClient, UserRole, MonitorType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Monitoring123!', 10);

  const organization = await prisma.organization.upsert({
    where: {
      slug: 'monitoring-demo',
    },
    update: {},
    create: {
      name: 'Monitoring Demo',
      slug: 'monitoring-demo',
    },
  });

  const user = await prisma.user.upsert({
    where: {
      email: 'luciamoralesalv1@gmail.com',
    },
    update: {
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
    },
    create: {
      email: 'luciamoralesalv1@gmail.com',
      name: 'Lucía Morales',
      passwordHash,
      role: UserRole.OWNER,
      organizationId: organization.id,
    },
  });

  const monitors = [
    {
      name: 'Google',
      target: 'https://www.google.com',
      expectedStatusCode: 200,
      frequencySeconds: 60,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'GitHub',
      target: 'https://github.com',
      expectedStatusCode: 200,
      frequencySeconds: 60,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Cloudflare',
      target: 'https://www.cloudflare.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'OpenAI',
      target: 'https://openai.com',
      expectedStatusCode: 200,
      frequencySeconds: 90,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Wikipedia',
      target: 'https://www.wikipedia.org',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Amazon',
      target: 'https://www.amazon.es',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Netflix',
      target: 'https://www.netflix.com/es',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'YouTube',
      target: 'https://www.youtube.com',
      expectedStatusCode: 200,
      frequencySeconds: 90,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'X / Twitter',
      target: 'https://x.com',
      expectedStatusCode: 200,
      frequencySeconds: 90,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Twitch',
      target: 'https://www.twitch.tv',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Reddit',
      target: 'https://www.reddit.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Spotify',
      target: 'https://open.spotify.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Stripe',
      target: 'https://stripe.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Vercel',
      target: 'https://vercel.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Supabase',
      target: 'https://supabase.com',
      expectedStatusCode: 200,
      frequencySeconds: 90,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'DigitalOcean',
      target: 'https://www.digitalocean.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Discord',
      target: 'https://discord.com',
      expectedStatusCode: 200,
      frequencySeconds: 90,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Figma',
      target: 'https://www.figma.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Canva',
      target: 'https://www.canva.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'LinkedIn',
      target: 'https://www.linkedin.com',
      expectedStatusCode: 999,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },

    // Monitores problemáticos para demo real

    {
      name: 'HTTP 500 Demo',
      target: 'https://httpstat.us/500',
      expectedStatusCode: 200,
      frequencySeconds: 45,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'HTTP 404 Demo',
      target: 'https://httpstat.us/404',
      expectedStatusCode: 200,
      frequencySeconds: 45,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Slow Response Demo',
      target: 'https://httpstat.us/200?sleep=8000',
      expectedStatusCode: 200,
      frequencySeconds: 60,
      timeoutSeconds: 5,
      type: 'HTTP',
    },
    {
      name: 'Random Status Demo',
      target: 'https://httpstat.us/random/200,500',
      expectedStatusCode: 200,
      frequencySeconds: 30,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Temporary Redirect Demo',
      target: 'https://httpstat.us/302',
      expectedStatusCode: 200,
      frequencySeconds: 45,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Maintenance Demo',
      target: 'https://httpstat.us/503',
      expectedStatusCode: 200,
      frequencySeconds: 45,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Timeout Demo',
      target: 'https://deelay.me/10000/https://google.com',
      expectedStatusCode: 200,
      frequencySeconds: 60,
      timeoutSeconds: 3,
      type: 'HTTP',
    },
    {
      name: 'JSON API Demo',
      target: 'https://jsonplaceholder.typicode.com/posts',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'GitHub API',
      target: 'https://api.github.com',
      expectedStatusCode: 200,
      frequencySeconds: 120,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
    {
      name: 'Open Meteo API',
      target:
        'https://api.open-meteo.com/v1/forecast?latitude=36.5&longitude=-6.3&hourly=temperature_2m',
      expectedStatusCode: 200,
      frequencySeconds: 180,
      timeoutSeconds: 10,
      type: 'HTTP',
    },
  ];

  for (const monitor of monitors) {
    const existingMonitor = await prisma.monitor.findFirst({
      where: {
        organizationId: organization.id,
        name: monitor.name,
      },
    });

    if (existingMonitor) {
      await prisma.monitor.update({
        where: { id: existingMonitor.id },
        data: {
          type: MonitorType.HTTP,
          target: monitor.target,
          expectedStatusCode: monitor.expectedStatusCode,
          frequencySeconds: monitor.frequencySeconds,
          timeoutSeconds: monitor.timeoutSeconds,
          isActive: true,
        },
      });
    } else {
      await prisma.monitor.create({
        data: {
          name: monitor.name,
          type: MonitorType.HTTP,
          target: monitor.target,
          expectedStatusCode: monitor.expectedStatusCode,
          frequencySeconds: monitor.frequencySeconds,
          timeoutSeconds: monitor.timeoutSeconds,
          isActive: true,
          organizationId: organization.id,
          createdById: user.id,
        },
      });
    }
  }

  console.log(`✅ Seed completado con ${monitors.length} monitores.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
