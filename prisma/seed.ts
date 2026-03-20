// prisma/seed.ts
import { PrismaClient, CefrLevel, WordType, Role } from '@prisma/client';
import { hashSync, genSaltSync } from 'bcrypt';

const prisma = new PrismaClient();

function hash(password: string) {
  return hashSync(password, genSaltSync(10));
}

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ─────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      email: 'admin@gmail.com',
      password: hash('Admin@123'),
      name: 'Admin',
      role: Role.ADMIN,
      provider: 'LOCAL',
      createdBy: { id: 'system', email: 'system' },
    },
  });
  console.log('✅ Admin user:', admin.email);

  // ── Topics ─────────────────────────────────────────────────────────────────
  const topicsData = [
    { name: 'Kinh doanh', nameEn: 'Business', emoji: '💼', color: '#6c8fff', sortOrder: 1 },
    { name: 'Du lịch', nameEn: 'Travel', emoji: '🌍', color: '#10b981', sortOrder: 2 },
    { name: 'Ẩm thực', nameEn: 'Food', emoji: '🍜', color: '#f59e0b', sortOrder: 3 },
    { name: 'Y tế & Sức khỏe', nameEn: 'Health', emoji: '💊', color: '#ef4444', sortOrder: 4 },
    { name: 'Công nghệ', nameEn: 'Technology', emoji: '💻', color: '#8b5cf6', sortOrder: 5 },
    { name: 'Giao tiếp hàng ngày', nameEn: 'Daily Communication', emoji: '💬', color: '#d946ef', sortOrder: 6 },
  ];

  const topics: Record<string, any> = {};
  for (const t of topicsData) {
    const topic = await prisma.topic.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
    topics[t.nameEn!] = topic;
    console.log(`✅ Topic: ${topic.name}`);
  }

  // ── Words ──────────────────────────────────────────────────────────────────
  const wordsData = [
    // A1
    {
      en: 'Hello', phonetic: '/həˈloʊ/', type: WordType.NOUN, level: CefrLevel.A1,
      meaning: 'Xin chào', example: 'Hello, how are you?',
      tags: ['greeting', 'basic'], topicKey: 'Daily Communication',
    },
    {
      en: 'Thank you', phonetic: '/θæŋk juː/', type: WordType.PHRASE, level: CefrLevel.A1,
      meaning: 'Cảm ơn', example: 'Thank you for your help.',
      tags: ['politeness', 'basic'], topicKey: 'Daily Communication',
    },
    // B1
    {
      en: 'Negotiate', phonetic: '/nɪˈɡoʊʃieɪt/', type: WordType.VERB, level: CefrLevel.B1,
      meaning: 'Đàm phán, thương lượng',
      example: 'We need to negotiate the contract terms.',
      exampleVi: 'Chúng ta cần đàm phán các điều khoản hợp đồng.',
      tags: ['business', 'formal'], topicKey: 'Business',
    },
    {
      en: 'Itinerary', phonetic: '/aɪˈtɪnəreri/', type: WordType.NOUN, level: CefrLevel.B1,
      meaning: 'Lịch trình chuyến đi',
      example: 'The travel agent sent us a detailed itinerary.',
      exampleVi: 'Đại lý du lịch đã gửi cho chúng tôi lịch trình chi tiết.',
      tags: ['travel', 'planning'], topicKey: 'Travel',
    },
    // B2
    {
      en: 'Eloquent', phonetic: '/ˈeləkwənt/', type: WordType.ADJECTIVE, level: CefrLevel.B2,
      meaning: 'Hùng hồn, lưu loát, diễn đạt rõ ràng',
      meaningEn: 'Well-spoken and clearly expressive',
      example: 'She gave an eloquent speech that moved the entire audience.',
      exampleVi: 'Cô ấy đã có bài phát biểu hùng hồn khiến cả khán giả xúc động.',
      tags: ['formal', 'communication'], topicKey: 'Business',
    },
    {
      en: 'Feasible', phonetic: '/ˈfiːzɪbl/', type: WordType.ADJECTIVE, level: CefrLevel.B2,
      meaning: 'Khả thi, có thể thực hiện được',
      meaningEn: 'Possible to do or achieve',
      example: 'Is it feasible to finish the project by Friday?',
      exampleVi: 'Có khả thi để hoàn thành dự án trước thứ Sáu không?',
      tags: ['business', 'planning'], topicKey: 'Business',
    },
    {
      en: 'Bandwidth', phonetic: '/ˈbændwɪdθ/', type: WordType.NOUN, level: CefrLevel.B2,
      meaning: 'Băng thông; (nghĩa bóng) năng lực xử lý công việc',
      example: "I don't have the bandwidth to take on another project right now.",
      tags: ['tech', 'business'], topicKey: 'Technology',
    },
    // C1
    {
      en: 'Meticulous', phonetic: '/məˈtɪkjʊləs/', type: WordType.ADJECTIVE, level: CefrLevel.C1,
      meaning: 'Tỉ mỉ, cẩn thận trong từng chi tiết nhỏ',
      meaningEn: 'Very careful and precise about details',
      example: 'She is meticulous about keeping accurate records.',
      exampleVi: 'Cô ấy rất tỉ mỉ trong việc lưu giữ hồ sơ chính xác.',
      tags: ['formal', 'work'], topicKey: 'Business',
    },
    {
      en: 'Proliferate', phonetic: '/prəˈlɪfəreɪt/', type: WordType.VERB, level: CefrLevel.C1,
      meaning: 'Phát triển nhanh, phổ biến rộng rãi',
      example: 'Social media platforms have proliferated rapidly.',
      tags: ['formal', 'growth'], topicKey: 'Technology',
    },
  ];

  for (const { topicKey, ...wordData } of wordsData) {
    const word = await prisma.word.upsert({
      where: { en: wordData.en },
      update: {},
      create: { ...wordData, tags: wordData.tags ?? [] },
    });

    if (topics[topicKey]) {
      await prisma.wordTopic.upsert({
        where: { wordId_topicId: { wordId: word.id, topicId: topics[topicKey].id } },
        update: {},
        create: { wordId: word.id, topicId: topics[topicKey].id },
      });
    }
    console.log(`✅ Word: ${word.en} (${word.level})`);
  }

  // ── Sample quiz ────────────────────────────────────────────────────────────
  const eloquentWord = await prisma.word.findUnique({ where: { en: 'Eloquent' } });
  const feasibleWord = await prisma.word.findUnique({ where: { en: 'Feasible' } });

  if (eloquentWord && feasibleWord) {
    await prisma.quiz.upsert({
      where: { id: 'seed-quiz-b2-001' },
      update: {},
      create: {
        id: 'seed-quiz-b2-001',
        title: 'Quiz B2 — Từ vựng kinh doanh',
        description: 'Kiểm tra từ vựng cấp B2 chủ đề kinh doanh',
        level: CefrLevel.B2,
        isPublished: true,
        totalPoints: 2,
        questions: {
          create: [
            {
              wordId: eloquentWord.id,
              questionText: '"Eloquent" có nghĩa là gì?',
              questionType: 'multiple_choice',
              options: [
                { id: 'a', text: 'Hùng hồn, lưu loát', isCorrect: true },
                { id: 'b', text: 'Mơ hồ, không rõ ràng', isCorrect: false },
                { id: 'c', text: 'Tỉ mỉ, cẩn thận', isCorrect: false },
                { id: 'd', text: 'Khả thi', isCorrect: false },
              ],
              answer: 'Hùng hồn, lưu loát',
              points: 1, sortOrder: 0,
            },
            {
              wordId: feasibleWord.id,
              questionText: '"Feasible" có nghĩa là gì?',
              questionType: 'multiple_choice',
              options: [
                { id: 'a', text: 'Không thể thực hiện', isCorrect: false },
                { id: 'b', text: 'Khả thi, có thể thực hiện', isCorrect: true },
                { id: 'c', text: 'Đàm phán', isCorrect: false },
                { id: 'd', text: 'Băng thông', isCorrect: false },
              ],
              answer: 'Khả thi, có thể thực hiện',
              points: 1, sortOrder: 1,
            },
          ],
        },
      },
    });
    console.log('✅ Sample quiz created');
  }

  console.log('\n🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
