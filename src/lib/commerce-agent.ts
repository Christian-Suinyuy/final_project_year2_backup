import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { prisma } from "@/lib/prisma";
import { messagingManager } from "@/lib/messaging/manager";
import { IncomingMessage } from "@/lib/messaging/types";

const money = (amount: unknown, currency: string) => `${currency === "NGN" ? "₦" : `${currency} `}${Number(amount).toLocaleString()}`;
const normalizePhone = (from: string) => from.replace(/@c\.us$/, "").replace(/\D/g, "");

export async function handleCustomerMessage(message: IncomingMessage) {
  const businessId = message.businessId;
  const phone = normalizePhone(message.from);
  const customer = await prisma.customer.upsert({ where: { businessId_phone: { businessId, phone } }, create: { businessId, phone }, update: {} });
  let conversation = await prisma.conversation.findFirst({ where: { businessId, customerId: message.from, status: "OPEN" }, orderBy: { updatedAt: "desc" } });
  if (!conversation) conversation = await prisma.conversation.create({ data: { businessId, customerId: message.from, customerRecordId: customer.id, status: "OPEN" } });
  await prisma.message.create({ data: { conversationId: conversation.id, role: "user", content: message.body, timestamp: new Date(message.timestamp * 1000) } });
  const [business, settings, history, allProducts] = await Promise.all([
    prisma.business.findUnique({ where: { id: businessId }, select: { name: true, email: true } }),
    prisma.businessSettings.findUnique({ where: { businessId } }),
    prisma.message.findMany({ where: { conversationId: conversation.id }, orderBy: { timestamp: "desc" }, take: 12 }),
    prisma.product.findMany({ where: { businessId, active: true }, orderBy: { updatedAt: "desc" }, take: 150 }),
  ]);
  const queryTokens = message.body.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const stopWords = new Set(["the", "are", "you", "have", "what", "how", "much", "does", "for", "and", "with", "from", "that", "this", "one", "under", "price", "stock", "please", "your", "can", "come"]);
  const useful = queryTokens.filter((token) => !stopWords.has(token));
  const budgetText = message.body.match(/\b(?:under|below|less than|up to|maximum|max)\s*[₦$€£]?\s*([\d,]+)/i)?.[1];
  const budget = budgetText ? Number(budgetText.replace(/,/g, "")) : null;
  const availabilityRequested = /\b(available|in stock|have any|what do you have)\b/i.test(message.body);
  const scopedProducts = allProducts.filter((product) => (budget === null || Number(product.price) < budget) && (!availabilityRequested || product.stock > 0));
  const ranked = scopedProducts
    .map((product) => ({
      product,
      score: useful.reduce(
        (score, token) => score + ((`${product.name} ${product.category} ${product.description} ${product.sku ?? ""}`).toLowerCase().includes(token) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score);
  const products = (ranked.some((row) => row.score) ? ranked.filter((row) => row.score > 0) : ranked.slice(0, 8)).slice(0, 8).map(({ product }) => ({ name: product.name, description: product.description, category: product.category, price: money(product.price, settings?.currency ?? "NGN"), stock: product.stock, sku: product.sku }));
  const messages = [...history].reverse().map((item) => `${item.role === "assistant" ? "Shop assistant" : "Customer"}: ${item.content}`);
  const context = {
    shop: business?.name ?? "Shop", description: settings?.shopDescription ?? "", address: settings?.address ?? "", currency: settings?.currency ?? "NGN", timezone: settings?.timezone ?? "Africa/Lagos",
    hours: settings?.openingHours ?? {}, delivery: { enabled: settings?.deliveryEnabled ?? false, areas: settings?.deliveryZones ?? [], notes: settings?.deliveryNotes ?? "" },
    payments: settings?.paymentMethods ?? [], policies: settings?.policies ?? "", greeting: settings?.welcomeMessage ?? "", assistantName: settings?.aiName ?? "Shop assistant", tone: settings?.aiTone ?? "Warm and helpful", customInstructions: settings?.aiInstructions ?? "", products,
  };
  let answer: string;
  if (process.env.GOOGLE_AI_API_KEY && process.env.GOOGLE_AI_API_KEY !== "your_gemini_api_key_here") {
    try {
      const model = new ChatGoogleGenerativeAI({ model: "gemini-2.5-flash", apiKey: process.env.GOOGLE_AI_API_KEY, temperature: 0.25, maxOutputTokens: 350 });
      const result = await model.invoke(`You are ${context.assistantName}, the WhatsApp shop assistant for ${context.shop}. Reply like a thoughtful local shopkeeper, in ${context.tone} tone. Keep replies concise and conversational. Follow the shop's custom instructions when they do not conflict with the facts and safety rules below. Use ONLY facts from SHOP DATA below. Never invent prices, stock, business hours, delivery availability or payment rules. If an answer is not in the data, say you will check with a person. Use the previous messages to resolve references like “the black one”. Do not claim an order was placed; collect details and offer human handoff when a customer is ready to buy.\n\nSHOP DATA (authoritative):\n${JSON.stringify(context)}\n\nRECENT CONVERSATION:\n${messages.join("\n")}\n\nCUSTOMER MESSAGE:\n${message.body}`);
      answer = typeof result.content === "string" ? result.content.trim() : result.content.map((part) => typeof part === "string" ? part : "text" in part ? part.text : "").join("").trim();
      if (!answer) throw new Error("Empty AI response");
    } catch (error) { console.error("Commerce assistant response failed", error); answer = fallbackAnswer(message.body, context, products); }
  } else answer = fallbackAnswer(message.body, context, products);
  await prisma.message.create({ data: { conversationId: conversation.id, role: "assistant", content: answer } });
  try { await messagingManager.send(businessId, message.from, answer); }
  catch (error) { console.error("WhatsApp reply send failed", error); }
}

function fallbackAnswer(message: string, context: { shop: string; currency: string; timezone: string; hours: unknown; delivery: { enabled: boolean; areas: unknown; notes: string }; payments: unknown; policies: string; assistantName: string }, products: { name: string; price: string; stock: number; category: string }[]) {
  const query = message.toLowerCase();
  if (/\b(open|opening|hours|close|closed|sunday|monday|tuesday|wednesday|thursday|friday|saturday|tomorrow)\b/.test(query)) {
    const weekdays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
    const localDay = new Intl.DateTimeFormat("en", { weekday: "short", timeZone: context.timezone }).format(new Date()).slice(0, 3).toLowerCase();
    const tomorrow = /tomorrow/.test(query);
    const day = /sunday/.test(query) ? "sun" : /monday/.test(query) ? "mon" : /tuesday/.test(query) ? "tue" : /wednesday/.test(query) ? "wed" : /thursday/.test(query) ? "thu" : /friday/.test(query) ? "fri" : /saturday/.test(query) ? "sat" : weekdays[(weekdays.indexOf(localDay) + (tomorrow ? 1 : 0) + 7) % 7];
    const hour = (context.hours as Record<string, { closed?: boolean; open?: string; close?: string }> | null)?.[day];
    return hour?.closed ? `We're closed ${day === "sun" ? "on Sunday" : `on ${day}`}. Send us a message and we'll get back to you when we're open.` : hour?.open && hour.close ? `We're open ${hour.open}–${hour.close} ${day === "sun" ? "on Sunday" : `on ${day}`}. How else can I help?` : `I don't have our opening hours to hand. I'll check with the shop team and get back to you.`;
  }
  if (/\b(deliver|delivery|ship|area|location)\b/.test(query)) {
    const zones = context.delivery.areas as { name: string; fee: number; threshold?: number }[];
    const matched = zones?.find((zone) => query.includes(zone.name.toLowerCase()));
    if (!context.delivery.enabled) return "We don't currently offer delivery. I can help you with a pickup instead.";
    if (matched) return `Yes, we deliver to ${matched.name}. The delivery fee is ${money(matched.fee, context.currency)}${matched.threshold ? `, and delivery is free for orders over ${money(matched.threshold, context.currency)}` : ""}.${context.delivery.notes ? ` ${context.delivery.notes}` : ""}`;
    if (zones?.length) return `Our delivery areas include ${zones.map((zone) => zone.name).join(", ")}. Tell me which area you're in and I'll check it for you.`;
    return "I don't have our delivery areas set up yet. I'll check with the shop team for you.";
  }
  if (/\b(pay|payment|transfer|cash|card)\b/.test(query) && Array.isArray(context.payments) && context.payments.length) return `We accept ${context.payments.join(", ")}. Which would work best for you?`;
  if (/\b(return|refund|exchange|cancel)\b/.test(query) && context.policies) return context.policies;
  if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(query) && query.split(/\s+/).length < 5) return context.assistantName === "Kora" ? `Hi there! Welcome to ${context.shop}. What can I help you find today?` : `Hi there! Welcome to ${context.shop}. What can I help you find today?`;
  if (products.length) {
    if (products.every((product) => product.stock === 0)) return "I couldn't find an in-stock match just now. Tell me a little more about what you're looking for and I'll check with the team.";
    const available = products.filter((product) => product.stock > 0).slice(0, 3);
    return `Here ${available.length === 1 ? "is" : "are"} ${available.length === 1 ? "an option" : "a few options"} from ${context.shop}: ${available.map((product) => `${product.name} (${product.price}, ${product.stock} in stock)`).join("; ")}. Would you like to know more about one of these?`;
  }
  const budgetText = message.match(/\b(?:under|below|less than|up to|maximum|max)\s*[₦$€£]?\s*([\d,]+)/i)?.[1];
  if (budgetText) return `I couldn't find an in-stock match under ${money(Number(budgetText.replace(/,/g, "")), context.currency)}. Would you like to see options in a different price range?`;
  return `Thanks for reaching out to ${context.shop}. Could you tell me a little more about what you're looking for? I can check availability with the shop team.`;
}
