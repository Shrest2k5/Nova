import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const files = await prisma.file.findMany({
    select: {
      id: true,
      originalName: true,
      status: true,
      aiStatus: true,
      aiErrorMessage: true,
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  console.log(JSON.stringify(files, null, 2));
} finally {
  await prisma.$disconnect();
}