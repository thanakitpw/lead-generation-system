import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('admin1234', 10)

  const user = await prisma.user.upsert({
    where: { email: 'admin@bestsolutionscorp.com' },
    update: {},
    create: {
      email: 'admin@bestsolutionscorp.com',
      passwordHash,
      fullName: 'Admin User',
    },
  })

  console.log(`Seeded user: ${user.email}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
