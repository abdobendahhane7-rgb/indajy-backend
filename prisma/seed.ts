import {
  PrismaClient,
  UserRole,
  ApprovalStatus,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";
import "dotenv/config";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const adminEmail = "aymanmkarti57@gmail.com";
  const adminPhone = "0661342372";
  const adminPassword = "Ayman@2026@";
  const adminFullName = "Ayman Mkarti";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { phone: adminPhone },
      ],
    },
  });

  if (existingAdmin) {
    await prisma.user.update({
      where: {
        id: existingAdmin.id,
      },
      data: {
        passwordHash,
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        approvalStatus: ApprovalStatus.APPROVED,
      },
    });

    console.log("Admin password tupdatea بنجاح");
    return;
  }

  await prisma.user.create({
    data: {
      fullName: adminFullName,
      email: adminEmail,
      phone: adminPhone,
      passwordHash,
      role: UserRole.ADMIN,
      city: "Dakhla",
      isActive: true,
      isVerified: true,
      approvalStatus: ApprovalStatus.APPROVED,
      wallet: {
        create: {
          balance: "0",
        },
      },
    },
  });

  console.log("Admin tcreatea بنجاح");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });