import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_PASSWORD } from "../src/lib/demo-credentials";
import { toWeekKey } from "../src/lib/week";
import { PEOPLE_SEED, PORTFOLIO_SEED } from "../src/lib/portfolio-data";

const prisma = new PrismaClient();

async function createDemoUser(
  email: string,
  name: string,
  role: string,
  projectNames: string[],
) {
  const projects = await prisma.project.findMany({
    where: { name: { in: projectNames } },
  });

  return prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
      assignments: {
        create: projects.map((project) => ({ projectId: project.id })),
      },
    },
  });
}

async function main() {
  await prisma.projectAssignment.deleteMany();
  await prisma.weeklyStatus.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.allocation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.project.deleteMany();
  await prisma.businessUnit.deleteMany();
  await prisma.person.deleteMany();
  await prisma.appSetting.deleteMany();

  const people = new Map<string, string>();
  for (const name of PEOPLE_SEED) {
    const person = await prisma.person.create({ data: { name } });
    people.set(name, person.id);
  }

  let globalPriority = 1;

  for (const unit of PORTFOLIO_SEED) {
    const businessUnit = await prisma.businessUnit.create({
      data: {
        name: unit.name,
        priority: unit.priority,
      },
    });

    for (const project of unit.projects) {
      await prisma.project.create({
        data: {
          name: project.name,
          domain: project.domain ?? null,
          lifecycle: project.lifecycle ?? "active",
          priority: globalPriority++,
          strategicWeight: unit.priority === 1 ? 5 : 3,
          businessUnitId: businessUnit.id,
          ownerId: project.owner ? people.get(project.owner) ?? null : null,
        },
      });
    }
  }

  await prisma.user.create({
    data: {
      email: "cpo@atom.local",
      name: "CPO ATOM",
      role: "c_level",
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
    },
  });

  await createDemoUser("po@atom.local", "Demo PO", "po", [
    "JGGL App",
    "JGGL Website",
  ]);
  await createDemoUser("pm@atom.local", "Demo PM", "pm", [
    "JGGL App",
    "JGGL Buddy + devices",
  ]);
  await createDemoUser("marketer@atom.local", "Demo Marketer", "marketer", [
    "JGGL Website",
    "JGGL App",
  ]);

  await prisma.appSetting.create({
    data: {
      key: "currentWeekStart",
      value: toWeekKey(new Date()),
    },
  });

  const userCount = await prisma.user.count();
  console.log(`Seeded portfolio + ${userCount} demo users (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
