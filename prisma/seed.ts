import "dotenv/config";
import { PrismaClient, UserRole, ApprovalStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding INDAJY...");

  const adminPassword = "Ayman@2026@@";
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminEmail = "aymanmkarti57@gmail.com";
  const adminPhone = "0661342372";

  let adminUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: adminEmail }, { phone: adminPhone }],
    },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        fullName: "Aymane Mkarti",
        email: adminEmail,
        phone: adminPhone,
        passwordHash: hashedPassword,
        role: UserRole.ADMIN,
        approvalStatus: ApprovalStatus.APPROVED,
        isActive: true,
        city: "Settat",
      },
    });
    console.log("✅ Admin created");
  } else {
    console.log("ℹ️ Admin déjà kayn");
  }

  const existingWallet = await prisma.wallet.findUnique({
    where: { userId: adminUser.id },
  });

  if (!existingWallet) {
    await prisma.wallet.create({
      data: {
        userId: adminUser.id,
        balance: 0,
      },
    });
    console.log("✅ Admin wallet created");
  } else {
    console.log("ℹ️ Admin wallet déjà kayn");
  }

  const existingSettings = await prisma.appSetting.findFirst();

  if (!existingSettings) {
    await prisma.appSetting.create({
      data: {
        operationFee: 10,
        rechargeFee: 0,
        minOrderKg: 1,
        isOrderingOpen: true,
      },
    });
    console.log("✅ Settings created");
  } else {
    console.log("ℹ️ Settings déjà kaynin");
  }

  console.log("🎉 Seed terminé !");
  console.log(`🔐 Admin login: ${adminPhone} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });