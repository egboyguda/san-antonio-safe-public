import "dotenv/config";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { db, pool } from "../db";
import {
  account,
  alertTemplates,
  barangays,
  emergencyContacts,
  evacuationCenters,
  incidentCategories,
  responders,
  systemSettings,
  user,
  userProfiles,
} from "../db/schema";
import { type AppRole, SAN_ANTONIO_BARANGAYS } from "../lib/domain/constants";

const incidentCategoriesSeed = [
  { id: "fire", name: "Fire", description: "Fire or smoke incident", defaultSeverityLevel: "critical" },
  { id: "flood", name: "Flood", description: "Flooding or rising water", defaultSeverityLevel: "high" },
  { id: "accident", name: "Accident", description: "Road or community accident", defaultSeverityLevel: "high" },
  { id: "medical", name: "Medical emergency", description: "Urgent medical assistance", defaultSeverityLevel: "critical" },
  { id: "crime-public-safety", name: "Crime or public safety", description: "Public safety, crime, or disturbance report", defaultSeverityLevel: "high" },
  { id: "typhoon", name: "Typhoon-related incident", description: "Typhoon damage, hazards, or rescue needs", defaultSeverityLevel: "high" },
  { id: "other", name: "Other emergency", description: "Other emergency concern", defaultSeverityLevel: "moderate" },
];

const emergencyContactsSeed = [
  { id: "contact-mdrrmo", name: "San Antonio MDRRMO", contactType: "MDRRMO", phoneNumber: "To be updated", address: "San Antonio, Northern Samar", sortOrder: 1 },
  { id: "contact-police", name: "San Antonio Police Station", contactType: "Police", phoneNumber: "To be updated", address: "San Antonio, Northern Samar", sortOrder: 2 },
  { id: "contact-fire", name: "San Antonio Fire Station", contactType: "Fire", phoneNumber: "To be updated", address: "San Antonio, Northern Samar", sortOrder: 3 },
  { id: "contact-health", name: "San Antonio Health Center", contactType: "Health", phoneNumber: "To be updated", address: "San Antonio, Northern Samar", sortOrder: 4 },
  { id: "contact-coast-guard", name: "Coast Guard / Rescue Coordination", contactType: "Rescue", phoneNumber: "To be updated", address: "San Antonio, Northern Samar", sortOrder: 5 },
];

const evacuationCentersSeed = SAN_ANTONIO_BARANGAYS.map((barangayName) => ({
  id: `evac-${barangayName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
  name: `${barangayName} Evacuation Center`,
  address: `${barangayName}, San Antonio, Northern Samar`,
  barangayName,
  capacity: null as number | null,
  contactPerson: "Barangay Official",
  contactNumber: "To be updated",
}));

const alertTemplatesSeed = [
  {
    id: "template-typhoon-warning",
    name: "Typhoon Warning",
    alertType: "typhoon",
    severityLevel: "high",
    title: "Typhoon Warning",
    message: "A typhoon warning is in effect. Secure your home, prepare emergency supplies, and follow official instructions.",
  },
  {
    id: "template-flood-warning",
    name: "Flood Warning",
    alertType: "flood",
    severityLevel: "high",
    title: "Flood Warning",
    message: "Flooding is possible in your area. Move to higher ground and avoid crossing flooded roads.",
  },
  {
    id: "template-evacuation-notice",
    name: "Evacuation Notice",
    alertType: "evacuation",
    severityLevel: "critical",
    title: "Evacuation Notice",
    message: "Please proceed to the nearest evacuation center and bring essential supplies.",
  },
  {
    id: "template-fire-alert",
    name: "Fire Alert",
    alertType: "fire",
    severityLevel: "critical",
    title: "Fire Alert",
    message: "A fire incident has been reported. Stay away from the affected area and allow responders to pass.",
  },
];

async function seedBarangays() {
  for (const name of SAN_ANTONIO_BARANGAYS) {
    await db
      .insert(barangays)
      .values({ id: `brgy-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`, name })
      .onConflictDoUpdate({ target: barangays.name, set: { name } });
  }
}

async function seedIncidentCategories() {
  for (const category of incidentCategoriesSeed) {
    await db
      .insert(incidentCategories)
      .values(category)
      .onConflictDoUpdate({
        target: incidentCategories.name,
        set: {
          description: category.description,
          defaultSeverityLevel: category.defaultSeverityLevel,
          isActive: true,
        },
      });
  }
}

async function seedEmergencyContacts() {
  for (const contact of emergencyContactsSeed) {
    await db
      .insert(emergencyContacts)
      .values({ ...contact, barangayId: null, isActive: true })
      .onConflictDoUpdate({
        target: emergencyContacts.id,
        set: {
          name: contact.name,
          contactType: contact.contactType,
          phoneNumber: contact.phoneNumber,
          address: contact.address,
          sortOrder: contact.sortOrder,
          isActive: true,
        },
      });
  }
}

async function seedEvacuationCenters() {
  const barangayRows = await db.select({ id: barangays.id, name: barangays.name }).from(barangays);
  const barangayByName = new Map(barangayRows.map((barangay) => [barangay.name, barangay.id]));

  for (const center of evacuationCentersSeed) {
    await db
      .insert(evacuationCenters)
      .values({
        id: center.id,
        name: center.name,
        address: center.address,
        barangayId: barangayByName.get(center.barangayName) ?? null,
        capacity: center.capacity,
        contactPerson: center.contactPerson,
        contactNumber: center.contactNumber,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: evacuationCenters.id,
        set: {
          name: center.name,
          address: center.address,
          barangayId: barangayByName.get(center.barangayName) ?? null,
          contactPerson: center.contactPerson,
          contactNumber: center.contactNumber,
          isActive: true,
        },
      });
  }
}

async function seedAlertTemplates() {
  for (const template of alertTemplatesSeed) {
    await db
      .insert(alertTemplates)
      .values({ ...template, createdByUserId: null, isActive: true })
      .onConflictDoUpdate({
        target: alertTemplates.name,
        set: {
          alertType: template.alertType,
          severityLevel: template.severityLevel,
          title: template.title,
          message: template.message,
          isActive: true,
        },
      });
  }
}

async function seedSettings() {
  await db
    .insert(systemSettings)
    .values({
      key: "seed.source",
      value: {
        municipality: "San Antonio, Northern Samar",
        barangaySource: "https://en.wikipedia.org/wiki/San_Antonio,_Northern_Samar",
      },
      updatedByUserId: null,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: {
          municipality: "San Antonio, Northern Samar",
          barangaySource: "https://en.wikipedia.org/wiki/San_Antonio,_Northern_Samar",
        },
      },
    });
}

type SeedAccountConfig = {
  role: AppRole;
  name: string;
  email: string;
  password: string;
  passwordEnvironmentVariable: string;
};

const seedAccountConfigs: SeedAccountConfig[] = [
  {
    role: "resident",
    name: process.env.SEED_RESIDENT_NAME ?? "Resident User",
    email: process.env.SEED_RESIDENT_EMAIL ?? "resident@sanantoniosafe.test",
    password: process.env.SEED_RESIDENT_PASSWORD ?? "Resident123!",
    passwordEnvironmentVariable: "SEED_RESIDENT_PASSWORD",
  },
  {
    role: "responder",
    name: process.env.SEED_RESPONDER_NAME ?? "Responder User",
    email: process.env.SEED_RESPONDER_EMAIL ?? "responder@sanantoniosafe.test",
    password: process.env.SEED_RESPONDER_PASSWORD ?? "Responder123!",
    passwordEnvironmentVariable: "SEED_RESPONDER_PASSWORD",
  },
  {
    role: "barangay_officer",
    name: process.env.SEED_BARANGAY_OFFICER_NAME ?? "Barangay Officer",
    email:
      process.env.SEED_BARANGAY_OFFICER_EMAIL ??
      "barangay.officer@sanantoniosafe.test",
    password:
      process.env.SEED_BARANGAY_OFFICER_PASSWORD ?? "BarangayOfficer123!",
    passwordEnvironmentVariable: "SEED_BARANGAY_OFFICER_PASSWORD",
  },
  {
    role: "command_center_staff",
    name: process.env.SEED_COMMAND_CENTER_NAME ?? "Command Center Staff",
    email:
      process.env.SEED_COMMAND_CENTER_EMAIL ?? "command.center@sanantoniosafe.test",
    password: process.env.SEED_COMMAND_CENTER_PASSWORD ?? "CommandCenter123!",
    passwordEnvironmentVariable: "SEED_COMMAND_CENTER_PASSWORD",
  },
  {
    role: "admin",
    name: process.env.SEED_ADMIN_NAME ?? "System Administrator",
    email: process.env.SEED_ADMIN_EMAIL ?? "admin@sanantoniosafe.test",
    password: process.env.SEED_ADMIN_PASSWORD ?? "Admin123!",
    passwordEnvironmentVariable: "SEED_ADMIN_PASSWORD",
  },
];

async function seedRoleAccount(config: SeedAccountConfig) {
  const name = config.name.trim();
  const email = config.email.trim().toLowerCase();

  if (!name) {
    throw new Error(`Seeded ${config.role} account name cannot be empty`);
  }
  if (!email) {
    throw new Error(`Seeded ${config.role} account email cannot be empty`);
  }
  if (config.password.length < 8) {
    throw new Error(
      `${config.passwordEnvironmentVariable} must be at least 8 characters`,
    );
  }

  const passwordHash = await hashPassword(config.password);
  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email));

  const userId = existingUser?.id ?? randomUUID();

  if (existingUser) {
    await db
      .update(user)
      .set({
        name,
        role: config.role,
        banned: false,
        banReason: null,
        banExpires: null,
        emailVerified: true,
      })
      .where(eq(user.id, userId));
  } else {
    await db.insert(user).values({
      id: userId,
      name,
      email,
      emailVerified: true,
      role: config.role,
      banned: false,
    });
  }

  const [credentialAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, userId),
        eq(account.providerId, "credential"),
      ),
    );

  if (credentialAccount) {
    await db
      .update(account)
      .set({ password: passwordHash, accountId: userId })
      .where(eq(account.id, credentialAccount.id));
  } else {
    await db.insert(account).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: passwordHash,
    });
  }

  await db
    .insert(userProfiles)
    .values({
      id: randomUUID(),
      userId,
      barangayId: "brgy-ward-i",
      address: "Ward I, San Antonio, Northern Samar",
    })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: {
        barangayId: "brgy-ward-i",
        address: "Ward I, San Antonio, Northern Samar",
      },
    });

  if (config.role === "responder") {
    await db
      .insert(responders)
      .values({
        id: randomUUID(),
        userId,
        barangayId: "brgy-ward-i",
        teamName: "Seed Response Team",
        specialization: "General emergency response",
        vehicle: "Emergency Vehicle 1",
      })
      .onConflictDoUpdate({
        target: responders.userId,
        set: {
          barangayId: "brgy-ward-i",
          teamName: "Seed Response Team",
          specialization: "General emergency response",
          vehicle: "Emergency Vehicle 1",
        },
      });
  }

  return { ...config, name, email };
}

async function seedRoleAccounts() {
  const normalizedEmails = new Set<string>();

  for (const config of seedAccountConfigs) {
    const email = config.email.trim().toLowerCase();
    if (normalizedEmails.has(email)) {
      throw new Error(`Seed account emails must be unique; duplicate: ${email}`);
    }
    normalizedEmails.add(email);
  }

  const seededAccounts = [];
  for (const config of seedAccountConfigs) {
    seededAccounts.push(await seedRoleAccount(config));
  }

  console.log("");
  console.log("Seeded role logins ready:");
  for (const seededAccount of seededAccounts) {
    console.log(`  ${seededAccount.role}:`);
    console.log(`    Email:    ${seededAccount.email}`);
    console.log(`    Password: ${seededAccount.password}`);
  }
  console.log("  URL: http://localhost:3000/login");
  console.log("");
}

async function main() {
  await seedBarangays();
  await seedIncidentCategories();
  await seedEmergencyContacts();
  await seedEvacuationCenters();
  await seedAlertTemplates();
  await seedSettings();
  await seedRoleAccounts();
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
