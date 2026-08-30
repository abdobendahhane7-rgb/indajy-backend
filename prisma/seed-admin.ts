import "dotenv/config";
import { PrismaClient, UserRole, ApprovalStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const phone = "0661342372";
  const plainPassword = "123456789";
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { phone },
    update: {
      passwordHash,
      role: UserRole.ADMIN,
      approvalStatus: ApprovalStatus.APPROVED,
      isActive: true,
    },
    create: {
      fullName: "Admin",
      phone,
      email: "admin@indajy.com",
      passwordHash,
      role: UserRole.ADMIN,
      approvalStatus: ApprovalStatus.APPROVED,
      isActive: true,
      wallet: {
        create: {
          balance: 0,
        },
      },
    },
  });

  console.log("✅ Admin ready");
  console.log("Phone:", admin.phone);
  console.log("Password:", plainPassword);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });