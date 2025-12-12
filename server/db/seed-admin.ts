import { db } from "./db";
import { adminUsers } from "./schema";
import bcrypt from "bcryptjs";

async function main() {
  const email = "sarahdesertpaddleboards@gmail.com";
  const password = "3v3ryth1ng1sAw3s0m3!";

  const passwordHash = await bcrypt.hash(password, 10);

  await db.insert(adminUsers).values({
    email,
    passwordHash,
  });

  console.log("Admin user created!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
