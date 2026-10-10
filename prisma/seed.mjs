import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const products = [
  { name: "Samsung Galaxy A15 Black 128GB", description: "6.5-inch smartphone, 128GB storage, black finish", sku: "PHONE-A15-BLK-128", category: "Phones", price: 185000, stock: 14 },
  { name: "Samsung Galaxy A55 Black 128GB", description: "6.6-inch smartphone with 5G, 128GB storage and black finish", sku: "PHONE-A55-BLK-128", category: "Phones", price: 480000, stock: 12 },
  { name: "Nike Air Force 1 White Size 42", description: "Classic white sneaker with premium cushioning, size 42", sku: "SHOE-AF1-WHT-42", category: "Footwear", price: 125000, stock: 8 },
  { name: "Noma Table Lamp", description: "Hand-finished ceramic base with a warm linen shade", sku: "HOME-001", category: "Lighting", price: 62000, stock: 24 },
  { name: "Oka Counter Stool", description: "Solid ash wood with a woven seat", sku: "HOME-002", category: "Furniture", price: 38500, stock: 12 },
  { name: "Muna Ceramic Vase", description: "Hand-thrown stoneware vase in natural sand", sku: "HOME-003", category: "Decor", price: 19000, stock: 36 },
  { name: "Kito Floor Lamp", description: "Adjustable reading light with a brushed brass finish", sku: "HOME-004", category: "Lighting", price: 98500, stock: 8 },
  { name: "Sabi Throw Blanket", description: "Soft cotton weave in forest green", sku: "HOME-005", category: "Textiles", price: 27500, stock: 0 },
];

async function main() {
  const email = "owner@koraliving.com";
  const passwordHash = await bcrypt.hash("Password123", 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Kora Owner", password: passwordHash },
    create: { name: "Kora Owner", email, password: passwordHash },
  });

  let business = await prisma.business.findFirst({ orderBy: { createdAt: "asc" } });

  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "Kora Living Demo",
        email: "hello@koraliving.com",
        industry: "Home & Lifestyle",
        settings: {
          create: {
            openingHours: { mon: { open: "09:00", close: "18:00", closed: false } },
            deliveryZones: [],
            policies: "Standard returns within 14 days.",
            welcomeMessage: "Welcome to Kora Living. How can I help you today?",
            currency: "NGN",
            timezone: "Africa/Lagos",
          },
        },
        members: {
          create: {
            userId: user.id,
            role: "admin",
          },
        },
      },
      include: { settings: true },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { businessId: business.id },
    });
  }

  await prisma.$transaction(products.map((product) => prisma.product.upsert({
    where: { businessId_sku: { businessId: business.id, sku: product.sku } },
    create: { ...product, businessId: business.id },
    update: { ...product, businessId: business.id },
  })));

  await prisma.businessSettings.upsert({
    where: { businessId: business.id },
    create: {
      businessId: business.id,
      openingHours: { mon: { open: "08:00", close: "18:00", closed: false }, tue: { open: "08:00", close: "18:00", closed: false }, wed: { open: "08:00", close: "18:00", closed: false }, thu: { open: "08:00", close: "18:00", closed: false }, fri: { open: "08:00", close: "18:00", closed: false }, sat: { open: "09:00", close: "15:00", closed: false }, sun: { closed: true } },
      deliveryZones: [{ name: "Nkwen", fee: 1500, threshold: 50000 }],
      deliveryNotes: "Delivery to Nkwen usually takes 1–2 hours.",
      policies: "Returns accepted within 14 days for unused items. Exchanges are available for defective products.",
      welcomeMessage: `Hello! Welcome to ${business.name}. How can we help today?`,
      paymentMethods: ["Bank transfer", "Cash on delivery"],
      currency: "NGN",
      timezone: "Africa/Lagos",
    },
    update: {
      openingHours: { mon: { open: "08:00", close: "18:00", closed: false }, tue: { open: "08:00", close: "18:00", closed: false }, wed: { open: "08:00", close: "18:00", closed: false }, thu: { open: "08:00", close: "18:00", closed: false }, fri: { open: "08:00", close: "18:00", closed: false }, sat: { open: "09:00", close: "15:00", closed: false }, sun: { closed: true } },
      deliveryZones: [{ name: "Nkwen", fee: 1500, threshold: 50000 }],
      deliveryNotes: "Delivery to Nkwen usually takes 1–2 hours.",
      paymentMethods: ["Bank transfer", "Cash on delivery"],
      currency: "NGN",
      timezone: "Africa/Lagos",
    },
  });

  console.log(`Seeded demo account ${email}, ${products.length} sample products and Nkwen delivery details into ${business.name}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
