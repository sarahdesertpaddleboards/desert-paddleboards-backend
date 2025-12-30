import bcrypt from "bcryptjs";
import { db } from "../server/db";
import { adminUsers } from "../server/db/schema";

async function run() {
  const email = "admin@sarahdesertpaddleboards.com";
  const password = "car3pd13m!R";

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(adminUsers).values({
    email,
    passwordHash,
  });

  console.log("✅ Admin user created:", email);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
