import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  password: string;
  businessId?: string | null;
  createdAt: string;
};

export type BusinessRecord = {
  id: string;
  name: string;
  email: string;
  ownerId: string;
  industry: string;
  createdAt: string;
  address?: string;
  phone?: string;
  currency?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
};

export type ProductRecord = {
  id: string;
  businessId: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  brand?: string;
  active: boolean;
  createdAt: string;
};

export type AppData = {
  users: UserRecord[];
  businesses: BusinessRecord[];
  products: ProductRecord[];
};

const dataDirectory = path.join(process.cwd(), "data");
const dataFile = path.join(dataDirectory, "demo-store.json");

const seedProducts: ProductRecord[] = [
  {
    id: "prod-samsung-a55",
    businessId: "demo-business",
    name: "Samsung Galaxy A55",
    sku: "SGA55-128-BLK",
    category: "Phones",
    price: 480000,
    stock: 12,
    description: "6.6-inch smartphone with 5G and 128GB storage.",
    brand: "Samsung",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod-nike-air",
    businessId: "demo-business",
    name: "Nike Air Force 1",
    sku: "NAF1-WHT-42",
    category: "Footwear",
    price: 125000,
    stock: 8,
    description: "Classic white sneaker with premium cushioning.",
    brand: "Nike",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "prod-lamp",
    businessId: "demo-business",
    name: "Noma Table Lamp",
    sku: "NOMA-LAMP-WARM",
    category: "Home Decor",
    price: 62000,
    stock: 24,
    description: "Warm-white table lamp with artisan finish.",
    brand: "Noma",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

function ensureDataFile() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    const demoUserId = "demo-owner";
    const passwordHash = bcrypt.hashSync("Password123", 12);
    const initialData: AppData = {
      users: [
        {
          id: demoUserId,
          name: "Kora Owner",
          email: "owner@koraliving.com",
          password: passwordHash,
          businessId: "demo-business",
          createdAt: new Date().toISOString(),
        },
      ],
      businesses: [
        {
          id: "demo-business",
          name: "Kora Living",
          email: "hello@koraliving.com",
          ownerId: demoUserId,
          industry: "Home & Lifestyle",
          createdAt: new Date().toISOString(),
          address: "Molyko, Buea",
          phone: "+237699000111",
          currency: "XAF",
          timezone: "Africa/Douala",
            settings: {
              businessName: "Kora Living",
              phone: "+237699000111",
              address: "Molyko, Buea",
              shopDescription: "Home essentials and lifestyle products designed for everyday convenience.",
              currency: "XAF",
              timezone: "Africa/Douala",
              openingHours: {
                mon: { open: "08:00", close: "18:00", closed: false },
                tue: { open: "08:00", close: "18:00", closed: false },
                wed: { open: "08:00", close: "18:00", closed: false },
                thu: { open: "08:00", close: "18:00", closed: false },
                fri: { open: "08:00", close: "18:00", closed: false },
                sat: { open: "09:00", close: "15:00", closed: false },
                sun: { closed: true },
              },
              deliveryEnabled: true,
              deliveryZones: [
                { name: "Molyko", fee: 2500, threshold: 20000 },
                { name: "Buea Town", fee: 3500 },
              ],
              paymentMethods: ["Cash on delivery", "Orange Money"],
              policies: "Returns accepted within 14 days for unused items. Exchanges permitted for defects.",
              welcomeMessage: "Hello! Welcome to Kora Living. How can we help today?",
              aiName: "Kora",
              aiTone: "Warm and helpful",
              aiInstructions: "Answer with clear product recommendations, delivery timing, and shop policies.",
            },
          },
        ],
        products: seedProducts.map((product) => ({ ...product, businessId: "demo-business" })),
      };

    fs.writeFileSync(dataFile, JSON.stringify(initialData, null, 2));
  }
}

export function readData(): AppData {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, "utf8");
  return JSON.parse(raw) as AppData;
}

export function writeData(data: AppData) {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

export async function createUser(input: { name: string; email: string; password: string }) {
  const data = readData();

  if (data.users.some((user) => user.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user: UserRecord = {
    id: `user-${Date.now()}`,
    name: input.name,
    email: input.email.toLowerCase(),
    password: passwordHash,
    businessId: null,
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  writeData(data);
  return user;
}

export function findUserByEmail(email: string) {
  const data = readData();
  return data.users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export function getUserById(userId: string) {
  const data = readData();
  return data.users.find((user) => user.id === userId) ?? null;
}

export async function verifyCredentials(email: string, password: string) {
  const user = findUserByEmail(email);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password);
  return isValid ? user : null;
}

export function getBusinessByUserId(userId: string) {
  const data = readData();
  const user = getUserById(userId);
  if (!user) return null;

  if (user.businessId) {
    return data.businesses.find((business) => business.id === user.businessId) ?? null;
  }

  return data.businesses.find((business) => business.ownerId === userId) ?? null;
}

export function createBusiness(input: {
  name: string;
  email: string;
  industry: string;
  ownerId: string;
}) {
  const data = readData();
  const user = getUserById(input.ownerId);

  if (!user) {
    throw new Error("User not found");
  }

  const existing = data.businesses.find((business) => business.ownerId === input.ownerId);
  if (existing) {
    return existing;
  }

  const business: BusinessRecord = {
    id: `biz-${Date.now()}`,
    name: input.name,
    email: input.email.toLowerCase(),
    ownerId: input.ownerId,
    industry: input.industry,
    createdAt: new Date().toISOString(),
    address: "",
    phone: "",
    currency: "XAF",
    timezone: "Africa/Douala",
  };

  data.businesses.push(business);
  const owner = data.users.find((entry) => entry.id === input.ownerId);
  if (owner) {
    owner.businessId = business.id;
  }

  writeData(data);
  return business;
}

export function listProductsForBusiness(businessId: string) {
  const data = readData();
  return data.products.filter((product) => product.businessId === businessId);
}

export function createProductForBusiness(businessId: string, product: Omit<ProductRecord, "id" | "businessId" | "createdAt">) {
  const data = readData();
  const record: ProductRecord = {
    id: `prod-${Date.now()}`,
    businessId,
    name: product.name,
    sku: product.sku,
    category: product.category,
    price: product.price,
    stock: product.stock,
    description: product.description,
    brand: product.brand,
    active: product.active,
    createdAt: new Date().toISOString(),
  };

  data.products.push(record);
  writeData(data);
  return record;
}

export function seedIfEmpty() {
  const data = readData();
  if (data.products.length === 0) {
    data.products = seedProducts;
    writeData(data);
  }
}
