// prisma/seed.ts
import { CefrLevel, WordType, Role } from '../src/generated/prisma/enums';

import { PrismaClient } from '../src/generated/prisma/client';

import { hashSync, genSaltSync } from 'bcrypt';

const prisma = new PrismaClient();
const hash = (p: string) => hashSync(p, genSaltSync(10));

// ── Helper: tạo quiz đầy đủ cấu trúc ──────────────────────────────────────────
async function createFullQuiz(data: {
  id: string;
  title: string;
  description: string;
  level: CefrLevel;
  durationMinutes?: number;
  tags: string[];
  isPublished?: boolean;
  pronunciationQuestions: {
    order: number;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
    phonetics?: string[];
  }[];
  vocabularyQuestions: {
    order: number;
    question: string;
    options: string[];
    answer: string;
    explanation: string;
  }[];
  readingQuestion: {
    order: number;
    title: string;
    passage: string;
    blanks: { label: string; options: string[]; answer: string }[];
  };
}) {
  // Xoá nếu đã tồn tại
  await prisma.quiz.deleteMany({ where: { id: data.id } });

  const quiz = await prisma.quiz.create({
    data: {
      id: data.id,
      title: data.title,
      description: data.description,
      level: data.level,
      durationMinutes: data.durationMinutes ?? 30,
      tags: data.tags,
      isPublished: data.isPublished ?? true,
      totalQuestions:
        data.pronunciationQuestions.length +
        data.vocabularyQuestions.length +
        data.readingQuestion.blanks.length,
    },
  });

  for (const q of data.pronunciationQuestions) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        type: 'pronunciation',
        order: q.order,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
        meta: q.phonetics ? { phonetics: q.phonetics } : undefined,
      },
    });
  }

  for (const q of data.vocabularyQuestions) {
    await prisma.quizQuestion.create({
      data: {
        quizId: quiz.id,
        type: 'vocabulary',
        order: q.order,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation,
      },
    });
  }

  const rq = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      type: 'reading_blank',
      order: data.readingQuestion.order,
      question: data.readingQuestion.title,
      passage: data.readingQuestion.passage,
      options: [],
      answer: '',
      meta: { title: data.readingQuestion.title },
    },
  });

  for (let i = 0; i < data.readingQuestion.blanks.length; i++) {
    const b = data.readingQuestion.blanks[i];
    await prisma.readingBlank.create({
      data: {
        questionId: rq.id,
        label: b.label,
        options: b.options,
        answer: b.answer,
        order: i + 1,
      },
    });
  }

  return quiz;
}

// ── Main seed ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin & test user ────────────────────────────────────────────────────────
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
  const testUser = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: {},
    create: {
      email: 'user@gmail.com',
      password: hash('User@123'),
      name: 'Nguyễn Văn A',
      role: Role.USER,
      provider: 'LOCAL',
      createdBy: { id: 'system', email: 'system' },
    },
  });
  console.log('✅ Users:', admin.email, testUser.email);

  // ── Topics ───────────────────────────────────────────────────────────────────
  const topicsData = [
    {
      name: 'Kinh doanh',
      nameEn: 'Business',
      emoji: '💼',
      color: '#6c8fff',
      sortOrder: 1,
    },
    {
      name: 'Du lịch',
      nameEn: 'Travel',
      emoji: '🌍',
      color: '#10b981',
      sortOrder: 2,
    },
    {
      name: 'Ẩm thực',
      nameEn: 'Food',
      emoji: '🍜',
      color: '#f59e0b',
      sortOrder: 3,
    },
    {
      name: 'Y tế & Sức khỏe',
      nameEn: 'Health',
      emoji: '💊',
      color: '#ef4444',
      sortOrder: 4,
    },
    {
      name: 'Công nghệ',
      nameEn: 'Technology',
      emoji: '💻',
      color: '#8b5cf6',
      sortOrder: 5,
    },
    {
      name: 'Giao tiếp hàng ngày',
      nameEn: 'Daily',
      emoji: '💬',
      color: '#d946ef',
      sortOrder: 6,
    },
  ];
  const topics: Record<string, any> = {};
  for (const t of topicsData) {
    const topic = await prisma.topic.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    });
    topics[t.nameEn!] = topic;
  }
  console.log('✅ Topics:', Object.keys(topics).join(', '));

  // ── Words ────────────────────────────────────────────────────────────────────
  const wordsData = [
    {
      en: 'Hello',
      phonetic: '/həˈloʊ/',
      type: WordType.PHRASE,
      level: CefrLevel.A1,
      meaning: 'Xin chào',
      example: 'Hello, how are you?',
      tags: ['greeting'],
      topicKey: 'Daily',
    },
    {
      en: 'Thank you',
      phonetic: '/θæŋk juː/',
      type: WordType.PHRASE,
      level: CefrLevel.A1,
      meaning: 'Cảm ơn',
      example: 'Thank you for your help.',
      tags: ['politeness'],
      topicKey: 'Daily',
    },
    {
      en: 'Negotiate',
      phonetic: '/nɪˈɡoʊʃieɪt/',
      type: WordType.VERB,
      level: CefrLevel.B1,
      meaning: 'Đàm phán, thương lượng',
      example: 'We need to negotiate the contract terms.',
      exampleVi: 'Chúng ta cần đàm phán các điều khoản hợp đồng.',
      tags: ['business', 'formal'],
      topicKey: 'Business',
    },
    {
      en: 'Itinerary',
      phonetic: '/aɪˈtɪnəreri/',
      type: WordType.NOUN,
      level: CefrLevel.B1,
      meaning: 'Lịch trình chuyến đi',
      example: 'The travel agent sent us a detailed itinerary.',
      tags: ['travel'],
      topicKey: 'Travel',
    },
    {
      en: 'Eloquent',
      phonetic: '/ˈeləkwənt/',
      type: WordType.ADJECTIVE,
      level: CefrLevel.B2,
      meaning: 'Hùng hồn, lưu loát',
      meaningEn: 'Well-spoken and expressive',
      example: 'She gave an eloquent speech.',
      exampleVi: 'Cô ấy đã có bài phát biểu hùng hồn.',
      tags: ['formal'],
      topicKey: 'Business',
    },
    {
      en: 'Feasible',
      phonetic: '/ˈfiːzɪbl/',
      type: WordType.ADJECTIVE,
      level: CefrLevel.B2,
      meaning: 'Khả thi',
      meaningEn: 'Possible to do or achieve',
      example: 'Is it feasible to finish the project by Friday?',
      tags: ['business'],
      topicKey: 'Business',
    },
    {
      en: 'Meticulous',
      phonetic: '/məˈtɪkjʊləs/',
      type: WordType.ADJECTIVE,
      level: CefrLevel.C1,
      meaning: 'Tỉ mỉ, cẩn thận trong từng chi tiết',
      meaningEn: 'Very careful and precise',
      example: 'She is meticulous about keeping accurate records.',
      exampleVi: 'Cô ấy rất tỉ mỉ trong việc lưu hồ sơ.',
      tags: ['formal'],
      topicKey: 'Business',
    },
    {
      en: 'Proliferate',
      phonetic: '/prəˈlɪfəreɪt/',
      type: WordType.VERB,
      level: CefrLevel.C1,
      meaning: 'Phát triển nhanh, lan rộng',
      example: 'Social media platforms have proliferated rapidly.',
      tags: ['formal'],
      topicKey: 'Technology',
    },
    {
      en: 'Bandwidth',
      phonetic: '/ˈbændwɪdθ/',
      type: WordType.NOUN,
      level: CefrLevel.B2,
      meaning: 'Băng thông; năng lực xử lý công việc',
      example: "I don't have the bandwidth to take on another project.",
      tags: ['tech', 'business'],
      topicKey: 'Technology',
    },
    {
      en: 'Cuisine',
      phonetic: '/kwɪˈziːn/',
      type: WordType.NOUN,
      level: CefrLevel.A2,
      meaning: 'Ẩm thực, phong cách nấu ăn',
      example: 'French cuisine is famous worldwide.',
      tags: ['food'],
      topicKey: 'Food',
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
        where: {
          wordId_topicId: { wordId: word.id, topicId: topics[topicKey].id },
        },
        update: {},
        create: { wordId: word.id, topicId: topics[topicKey].id },
      });
    }
  }
  console.log('✅ Words:', wordsData.length);

  // ── QUIZ 1: Phát âm & Từ vựng Cơ bản (A2) ────────────────────────────────
  await createFullQuiz({
    id: 'quiz-a2-basic-001',
    title: 'Phát âm & Từ vựng Cơ bản',
    description: 'Luyện tập phát âm và từ vựng thường gặp hàng ngày.',
    level: CefrLevel.A2,
    tags: ['Phát âm', 'Cơ bản'],
    isPublished: true,
    pronunciationQuestions: [
      {
        order: 1,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['bear', 'pear', 'fear', 'wear'],
        answer: 'fear',
        explanation: '"fear" /fɪər/ có âm /ɪ/, các từ còn lại đều có /eər/.',
        phonetics: ['/beər/', '/peər/', '/fɪər/', '/weər/'],
      },
      {
        order: 2,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['though', 'through', 'thought', 'thorough'],
        answer: 'through',
        explanation:
          '"through" /θruː/ — âm /uː/. Các từ còn lại: though /ðəʊ/, thought /θɔːt/, thorough /ˈθʌrə/.',
      },
      {
        order: 3,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['break', 'steak', 'great', 'treat'],
        answer: 'treat',
        explanation:
          '"treat" /triːt/ có âm /iː/. Các từ còn lại đều có âm /eɪ/.',
        phonetics: ['/breɪk/', '/steɪk/', '/ɡreɪt/', '/triːt/'],
      },
      {
        order: 4,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['blood', 'flood', 'food', 'mood'],
        answer: 'blood',
        explanation:
          '"blood" /blʌd/ và "flood" /flʌd/ có âm /ʌ/. "food" /fuːd/ và "mood" /muːd/ có âm /uː/. Nhóm đa số là /uː/, nên "blood" khác biệt.',
        phonetics: ['/blʌd/', '/flʌd/', '/fuːd/', '/muːd/'],
      },
      {
        order: 5,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['find', 'mind', 'wind (noun)', 'kind'],
        answer: 'wind (noun)',
        explanation:
          '"wind" (danh từ - gió) /wɪnd/ có âm /ɪ/. find /faɪnd/, mind /maɪnd/, kind /kaɪnd/ đều có /aɪ/.',
      },
    ],
    vocabularyQuestions: [
      {
        order: 6,
        question: 'Chọn nghĩa đúng của từ "eloquent":',
        options: [
          'Thô lỗ, thiếu lịch sự',
          'Hùng hồn, diễn đạt lưu loát',
          'Im lặng, không nói',
          'Khó hiểu, bí ẩn',
        ],
        answer: 'Hùng hồn, diễn đạt lưu loát',
        explanation:
          'Eloquent = having the ability to speak or write clearly and effectively.',
      },
      {
        order: 7,
        question: 'Từ "meticulous" có nghĩa là:',
        options: [
          'Cẩu thả, bất cẩn',
          'Tỉ mỉ, cẩn thận đến từng chi tiết',
          'Nhanh chóng, vội vã',
          'Mơ hồ, không rõ ràng',
        ],
        answer: 'Tỉ mỉ, cẩn thận đến từng chi tiết',
        explanation: 'Meticulous = very careful and precise about details.',
      },
      {
        order: 8,
        question:
          'Điền từ phù hợp: "The scientist made a ___ discovery that changed medicine."',
        options: ['mundane', 'trivial', 'groundbreaking', 'ordinary'],
        answer: 'groundbreaking',
        explanation:
          'Groundbreaking = pioneering, revolutionary. Các từ còn lại đều có nghĩa tầm thường.',
      },
      {
        order: 9,
        question: '"Benevolent" có nghĩa gần nhất với từ nào?',
        options: ['Hostile', 'Kind', 'Greedy', 'Careless'],
        answer: 'Kind',
        explanation: 'Benevolent = well-meaning and kindly.',
      },
      {
        order: 10,
        question: 'Chọn từ TRÁI NGHĨA với "abundant":',
        options: ['plentiful', 'scarce', 'ample', 'generous'],
        answer: 'scarce',
        explanation: 'Abundant = nhiều, dồi dào. Scarce = khan hiếm.',
      },
      {
        order: 11,
        question: '"Procrastinate" có nghĩa là:',
        options: [
          'Làm việc chăm chỉ',
          'Trì hoãn, để sau',
          'Lên kế hoạch cẩn thận',
          'Hoàn thành sớm',
        ],
        answer: 'Trì hoãn, để sau',
        explanation: 'Procrastinate = delay or postpone action.',
      },
      {
        order: 12,
        question: 'Từ nào ĐỒNG NGHĨA với "resilient"?',
        options: ['Fragile', 'Stubborn', 'Adaptable', 'Passive'],
        answer: 'Adaptable',
        explanation:
          'Resilient = able to recover quickly. Adaptable = có khả năng thích nghi.',
      },
      {
        order: 13,
        question: '"Ambiguous" có nghĩa là:',
        options: [
          'Rõ ràng, dứt khoát',
          'Tham vọng lớn',
          'Không rõ ràng, có thể hiểu nhiều cách',
          'Thân thiện, dễ gần',
        ],
        answer: 'Không rõ ràng, có thể hiểu nhiều cách',
        explanation: 'Ambiguous = open to more than one interpretation.',
      },
      {
        order: 14,
        question: '"Deteriorate" có nghĩa là:',
        options: [
          'Cải thiện dần dần',
          'Duy trì ổn định',
          'Suy giảm, xuống cấp dần',
          'Phát triển mạnh mẽ',
        ],
        answer: 'Suy giảm, xuống cấp dần',
        explanation: 'Deteriorate = become progressively worse.',
      },
      {
        order: 15,
        question:
          'Chọn từ phù hợp: "The new policy will ___ the company\'s profits."',
        options: ['diminish', 'boost', 'ignore', 'conceal'],
        answer: 'boost',
        explanation: 'Boost = increase, enhance. Context cần từ tích cực.',
      },
      {
        order: 16,
        question: '"Diligent" có nghĩa gần nhất với:',
        options: ['Lazy', 'Careless', 'Hardworking', 'Talented'],
        answer: 'Hardworking',
        explanation: 'Diligent = showing care and conscientiousness in work.',
      },
      {
        order: 17,
        question: 'Từ "obsolete" có nghĩa là:',
        options: [
          'Hiện đại, tiên tiến',
          'Lỗi thời, không còn dùng',
          'Phổ biến rộng rãi',
          'Quan trọng, thiết yếu',
        ],
        answer: 'Lỗi thời, không còn dùng',
        explanation: 'Obsolete = no longer produced or used; out of date.',
      },
      {
        order: 18,
        question: '"Substantial" có nghĩa là:',
        options: [
          'Nhỏ bé, không đáng kể',
          'Đáng kể, lớn, quan trọng',
          'Mỏng manh, dễ vỡ',
          'Không chắc chắn',
        ],
        answer: 'Đáng kể, lớn, quan trọng',
        explanation:
          'Substantial = of considerable importance, size, or worth.',
      },
      {
        order: 19,
        question: 'Chọn từ ĐỒNG NGHĨA với "commence":',
        options: ['Finish', 'Postpone', 'Begin', 'Cancel'],
        answer: 'Begin',
        explanation:
          'Commence = begin, start. Dùng trong văn phong trang trọng.',
      },
      {
        order: 20,
        question: '"Perseverance" có nghĩa là:',
        options: [
          'Sự vội vã, hấp tấp',
          'Sự kiên trì, bền bỉ',
          'Sự thông minh vượt trội',
          'Sự may mắn tình cờ',
        ],
        answer: 'Sự kiên trì, bền bỉ',
        explanation: 'Perseverance = continued effort despite difficulty.',
      },
    ],
    readingQuestion: {
      order: 21,
      title: 'Bài đọc: Artificial Intelligence in Education',
      passage:
        "Artificial intelligence is rapidly [BLANK1] the landscape of modern education. Schools and universities are now [BLANK2] AI-powered tools to personalize learning experiences. These systems can [BLANK3] a student's progress in real time and [BLANK4] customized lesson plans. While some educators have [BLANK5] concerns about over-reliance on technology, most agree that AI has the [BLANK6] to improve educational outcomes.",
      blanks: [
        {
          label: 'BLANK1',
          options: ['transforming', 'destroying', 'ignoring', 'avoiding'],
          answer: 'transforming',
        },
        {
          label: 'BLANK2',
          options: ['refusing', 'adopting', 'prohibiting', 'abandoning'],
          answer: 'adopting',
        },
        {
          label: 'BLANK3',
          options: ['ignore', 'track', 'delete', 'lose'],
          answer: 'track',
        },
        {
          label: 'BLANK4',
          options: ['generate', 'remove', 'reject', 'forget'],
          answer: 'generate',
        },
        {
          label: 'BLANK5',
          options: ['celebrated', 'raised', 'dismissed', 'forgotten'],
          answer: 'raised',
        },
        {
          label: 'BLANK6',
          options: ['failure', 'potential', 'problem', 'waste'],
          answer: 'potential',
        },
      ],
    },
  });
  console.log('✅ Quiz 1: Phát âm & Từ vựng Cơ bản');

  // ── QUIZ 2: Business English (B2) ────────────────────────────────────────────
  await createFullQuiz({
    id: 'quiz-b2-business-001',
    title: 'Business English',
    description: 'Từ vựng và kỹ năng đọc trong môi trường kinh doanh.',
    level: CefrLevel.B2,
    tags: ['Kinh doanh', 'B2'],
    isPublished: true,
    pronunciationQuestions: [
      {
        order: 1,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['debt', 'doubt', 'subtle', 'habit'],
        answer: 'habit',
        explanation:
          '"habit" /ˈhæbɪt/ - chữ "b" được phát âm. Các từ còn lại đều có chữ "b" câm.',
      },
      {
        order: 2,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['colleague', 'fatigue', 'league', 'vague'],
        answer: 'colleague',
        explanation:
          '"colleague" /ˈkɒliːɡ/ nhấn vào âm tiết đầu. Các từ còn lại nhấn âm tiết cuối.',
      },
      {
        order: 3,
        question: 'Từ nào có trọng âm KHÁC với các từ còn lại?',
        options: ["'record (n)", "re'cord (v)", "'present (n)", "pre'sent (v)"],
        answer: "re'cord (v)",
        explanation:
          "Danh từ nhấn âm tiết đầu, động từ nhấn âm tiết sau. re'cord (v) nhấn âm 2, tương tự các động từ còn lại.",
      },
      {
        order: 4,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['determine', 'conference', 'preference', 'reference'],
        answer: 'determine',
        explanation:
          '"determine" /dɪˈtɜːmɪn/ nhấn âm tiết 2. Các từ còn lại đều nhấn âm tiết đầu.',
      },
      {
        order: 5,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['entrepreneur', 'bureau', 'plateau', 'chateau'],
        answer: 'entrepreneur',
        explanation:
          '"entrepreneur" /ˌɒntrəprəˈnɜːr/ — âm "eur" cuối đọc /ɜːr/. Các từ còn lại "eau" đọc /əʊ/.',
      },
    ],
    vocabularyQuestions: [
      {
        order: 6,
        question: '"Synergy" trong kinh doanh có nghĩa là:',
        options: [
          'Sự cạnh tranh gay gắt',
          'Sự cộng hưởng, phối hợp tạo kết quả tốt hơn',
          'Sự phá sản của công ty',
          'Chiến lược cắt giảm chi phí',
        ],
        answer: 'Sự cộng hưởng, phối hợp tạo kết quả tốt hơn',
        explanation:
          'Synergy = the combined effect greater than the sum of individual efforts.',
      },
      {
        order: 7,
        question: '"Stakeholder" là:',
        options: [
          'Cổ đông duy nhất của công ty',
          'Bất kỳ ai có lợi ích liên quan đến tổ chức',
          'Nhân viên cấp cao nhất',
          'Người cho vay tiền',
        ],
        answer: 'Bất kỳ ai có lợi ích liên quan đến tổ chức',
        explanation:
          'Stakeholder = anyone with an interest or concern in an organization.',
      },
      {
        order: 8,
        question:
          'Điền từ: "The company needs to ___ its brand image after the scandal."',
        options: ['demolish', 'rebrand', 'ignore', 'duplicate'],
        answer: 'rebrand',
        explanation:
          'Rebrand = change the image/identity of a company or product.',
      },
      {
        order: 9,
        question: '"Leverage" trong kinh doanh thường có nghĩa là:',
        options: [
          'Từ bỏ cơ hội',
          'Sử dụng tài nguyên hiện có để tối đa hoá lợi thế',
          'Tăng số lượng nhân viên',
          'Giảm chi phí sản xuất',
        ],
        answer: 'Sử dụng tài nguyên hiện có để tối đa hoá lợi thế',
        explanation: 'Leverage = use something to maximum advantage.',
      },
      {
        order: 10,
        question: '"Benchmark" trong kinh doanh là:',
        options: [
          'Bàn làm việc của CEO',
          'Tiêu chuẩn để so sánh và đánh giá hiệu suất',
          'Điểm breakeven của công ty',
          'Mức lương tối thiểu',
        ],
        answer: 'Tiêu chuẩn để so sánh và đánh giá hiệu suất',
        explanation:
          'Benchmark = a standard used as a point of reference for evaluating performance.',
      },
      {
        order: 11,
        question: '"Viable" có nghĩa là:',
        options: [
          'Không thể thực hiện được',
          'Có thể thực hiện được và có khả năng thành công',
          'Rất rủi ro và nguy hiểm',
          'Lỗi thời, lạc hậu',
        ],
        answer: 'Có thể thực hiện được và có khả năng thành công',
        explanation: 'Viable = capable of working successfully; feasible.',
      },
      {
        order: 12,
        question:
          'Điền từ: "We need to ___ the risks before making a final decision."',
        options: ['ignore', 'celebrate', 'mitigate', 'exaggerate'],
        answer: 'mitigate',
        explanation:
          'Mitigate = lessen the severity, seriousness, or painfulness of something.',
      },
      {
        order: 13,
        question: '"Paradigm shift" có nghĩa là:',
        options: [
          'Thay đổi nhỏ trong quy trình',
          'Sự thay đổi căn bản trong cách tiếp cận hoặc tư duy',
          'Tăng ca làm việc',
          'Chuyển văn phòng sang địa điểm mới',
        ],
        answer: 'Sự thay đổi căn bản trong cách tiếp cận hoặc tư duy',
        explanation:
          'Paradigm shift = a fundamental change in approach or underlying assumptions.',
      },
      {
        order: 14,
        question: '"Scalable" trong context công nghệ/kinh doanh là:',
        options: [
          'Không thể mở rộng',
          'Có thể mở rộng để xử lý tăng trưởng',
          'Chỉ hoạt động ở quy mô nhỏ',
          'Tốn kém chi phí vận hành',
        ],
        answer: 'Có thể mở rộng để xử lý tăng trưởng',
        explanation:
          'Scalable = able to be changed in size or scale; able to grow without performance loss.',
      },
      {
        order: 15,
        question: '"Turnover" trong kinh doanh có thể có nghĩa là:',
        options: [
          'Chỉ có nghĩa là doanh thu',
          'Chỉ có nghĩa là tỷ lệ nghỉ việc',
          'Cả doanh thu lẫn tỷ lệ nhân viên nghỉ việc',
          'Lợi nhuận ròng sau thuế',
        ],
        answer: 'Cả doanh thu lẫn tỷ lệ nhân viên nghỉ việc',
        explanation:
          'Turnover có 2 nghĩa: (1) total sales revenue, (2) rate at which employees leave a company.',
      },
      {
        order: 16,
        question:
          'Điền từ: "The merger will create significant ___ as both companies combine operations."',
        options: ['losses', 'synergies', 'debts', 'conflicts'],
        answer: 'synergies',
        explanation:
          'Synergies = benefits arising from combining two companies.',
      },
      {
        order: 17,
        question: '"Disruptive innovation" là:',
        options: [
          'Đổi mới làm phá vỡ thị trường hiện tại',
          'Sửa chữa sản phẩm bị hỏng',
          'Cắt giảm ngân sách R&D',
          'Cải tiến nhỏ trong quy trình',
        ],
        answer: 'Đổi mới làm phá vỡ thị trường hiện tại',
        explanation:
          'Disruptive innovation = creates a new market and displaces established competitors.',
      },
      {
        order: 18,
        question: '"Bottleneck" trong quản lý sản xuất là:',
        options: [
          'Sản phẩm bán chạy nhất',
          'Điểm tắc nghẽn làm chậm toàn bộ quy trình',
          'Kho chứa hàng tồn',
          'Nhân viên năng suất nhất',
        ],
        answer: 'Điểm tắc nghẽn làm chậm toàn bộ quy trình',
        explanation:
          'Bottleneck = a point of congestion in a system that slows overall production.',
      },
      {
        order: 19,
        question: '"Procurement" có nghĩa là:',
        options: [
          'Quy trình sa thải nhân viên',
          'Quá trình mua sắm, thu mua nguyên vật liệu',
          'Chiến dịch marketing',
          'Báo cáo tài chính hàng quý',
        ],
        answer: 'Quá trình mua sắm, thu mua nguyên vật liệu',
        explanation:
          'Procurement = the process of obtaining supplies or services for a business.',
      },
      {
        order: 20,
        question: '"Fiscal year" là:',
        options: [
          'Năm dương lịch từ 1/1 đến 31/12',
          'Năm tài chính, có thể khác năm dương lịch',
          'Năm học của nhân viên',
          'Chu kỳ sản xuất hàng năm',
        ],
        answer: 'Năm tài chính, có thể khác năm dương lịch',
        explanation:
          'Fiscal year = 12-month period used for financial reporting; may not match calendar year.',
      },
    ],
    readingQuestion: {
      order: 21,
      title: 'Bài đọc: The Future of Remote Work',
      passage:
        'The COVID-19 pandemic fundamentally [BLANK1] the way businesses operate. Companies that once [BLANK2] remote work as a temporary solution now recognise it as a [BLANK3] component of their strategy. Research shows that employees who work remotely report higher [BLANK4] and lower stress levels. However, maintaining company culture and [BLANK5] among dispersed teams remains a significant challenge. Forward-thinking organisations are [BLANK6] hybrid models that combine in-office and remote arrangements.',
      blanks: [
        {
          label: 'BLANK1',
          options: ['ignored', 'transformed', 'destroyed', 'replicated'],
          answer: 'transformed',
        },
        {
          label: 'BLANK2',
          options: ['embraced', 'rejected', 'celebrated', 'mandated'],
          answer: 'rejected',
        },
        {
          label: 'BLANK3',
          options: ['temporary', 'irrelevant', 'permanent', 'costly'],
          answer: 'permanent',
        },
        {
          label: 'BLANK4',
          options: ['absenteeism', 'productivity', 'turnover', 'expenditure'],
          answer: 'productivity',
        },
        {
          label: 'BLANK5',
          options: ['isolation', 'collaboration', 'competition', 'bureaucracy'],
          answer: 'collaboration',
        },
        {
          label: 'BLANK6',
          options: ['abandoning', 'criticising', 'adopting', 'prohibiting'],
          answer: 'adopting',
        },
      ],
    },
  });
  console.log('✅ Quiz 2: Business English');

  // ── QUIZ 3: Travel & Culture (B1) ────────────────────────────────────────────
  await createFullQuiz({
    id: 'quiz-b1-travel-001',
    title: 'Travel & Culture',
    description: 'Từ vựng về du lịch, văn hóa và trải nghiệm quốc tế.',
    level: CefrLevel.B1,
    tags: ['Du lịch', 'Văn hóa'],
    isPublished: true,
    pronunciationQuestions: [
      {
        order: 1,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['island', 'aisle', 'listen', 'castle'],
        answer: 'aisle',
        explanation:
          '"aisle" /aɪl/ — chữ "s" câm nhưng âm /aɪ/. Các từ còn lại đều có chữ "s" câm nhưng khác âm chính.',
      },
      {
        order: 2,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['buffet', 'ballet', 'wallet', 'bouquet'],
        answer: 'wallet',
        explanation:
          '"wallet" /ˈwɒlɪt/ — phát âm đầy đủ phụ âm cuối /t/. Các từ còn lại mượn từ tiếng Pháp, phụ âm cuối câm.',
      },
      {
        order: 3,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['yacht', 'watch', 'match', 'catch'],
        answer: 'yacht',
        explanation:
          '"yacht" /jɒt/ — âm /j/ ở đầu và không phát âm "ch". Các từ còn lại đều có âm /tʃ/.',
      },
      {
        order: 4,
        question: 'Từ nào nhấn trọng âm KHÁC với các từ còn lại?',
        options: ["'photograph", "pho'tography", "photo'graphic", "'telephone"],
        answer: "'telephone",
        explanation:
          '"telephone" nhấn âm tiết đầu giống "photograph". Nhưng "photograph" thay đổi khi thêm hậu tố.',
      },
      {
        order: 5,
        question: 'Từ nào có cách phát âm KHÁC với các từ còn lại?',
        options: ['receipt', 'deceive', 'receive', 'conceive'],
        answer: 'receipt',
        explanation:
          '"receipt" /rɪˈsiːt/ — chữ "p" câm, phát âm /t/ cuối. Các từ còn lại kết thúc bằng /v/.',
      },
    ],
    vocabularyQuestions: [
      {
        order: 6,
        question: '"Itinerary" có nghĩa là:',
        options: [
          'Vé máy bay khứ hồi',
          'Lịch trình chi tiết của chuyến đi',
          'Bản đồ địa phương',
          'Cuốn sách hướng dẫn du lịch',
        ],
        answer: 'Lịch trình chi tiết của chuyến đi',
        explanation:
          'Itinerary = a planned route or journey; detailed travel schedule.',
      },
      {
        order: 7,
        question: '"Accommodation" có nghĩa là:',
        options: [
          'Chỗ ở, nơi lưu trú',
          'Phương tiện di chuyển',
          'Phí bảo hiểm du lịch',
          'Thực đơn nhà hàng',
        ],
        answer: 'Chỗ ở, nơi lưu trú',
        explanation:
          'Accommodation = a place where travellers can sleep and stay.',
      },
      {
        order: 8,
        question:
          'Điền từ: "The ancient temple is a major tourist ___ that attracts millions of visitors."',
        options: ['hindrance', 'attraction', 'repulsion', 'disappointment'],
        answer: 'attraction',
        explanation:
          'Tourist attraction = a place of interest that attracts visitors.',
      },
      {
        order: 9,
        question: '"Jet lag" là:',
        options: [
          'Hành lý bị thất lạc',
          'Mệt mỏi do thay đổi múi giờ khi bay xa',
          'Chứng sợ máy bay',
          'Vé máy bay hạng thương gia',
        ],
        answer: 'Mệt mỏi do thay đổi múi giờ khi bay xa',
        explanation:
          'Jet lag = tiredness and disorientation after a long flight across time zones.',
      },
      {
        order: 10,
        question: '"Souvenir" có nghĩa là:',
        options: [
          'Quà lưu niệm mang về từ chuyến du lịch',
          'Vé tham quan bảo tàng',
          'Bữa ăn truyền thống địa phương',
          'Hướng dẫn viên du lịch',
        ],
        answer: 'Quà lưu niệm mang về từ chuyến du lịch',
        explanation:
          'Souvenir = a thing kept as a reminder of a person, place, or event.',
      },
      {
        order: 11,
        question: '"Layover" trong du lịch hàng không là:',
        options: [
          'Hạng ghế ngồi trên máy bay',
          'Thời gian dừng tại một sân bay trước khi bay tiếp',
          'Khoang hành lý',
          'Thủ tục kiểm tra an ninh',
        ],
        answer: 'Thời gian dừng tại một sân bay trước khi bay tiếp',
        explanation: 'Layover = a period of rest or waiting between flights.',
      },
      {
        order: 12,
        question: '"Backpacker" thường chỉ người:',
        options: [
          'Mang vali hạng sang du lịch',
          'Du lịch tiết kiệm với ba lô và ngân sách thấp',
          'Làm việc cho công ty lữ hành',
          'Hướng dẫn viên leo núi',
        ],
        answer: 'Du lịch tiết kiệm với ba lô và ngân sách thấp',
        explanation:
          'Backpacker = a traveller who travels cheaply, typically staying in hostels.',
      },
      {
        order: 13,
        question:
          'Điền từ: "Visitors must ___ local customs and traditions when travelling abroad."',
        options: ['ignore', 'mock', 'respect', 'copy'],
        answer: 'respect',
        explanation:
          'Respect local customs = show consideration for local traditions and practices.',
      },
      {
        order: 14,
        question: '"Landmark" trong du lịch là:',
        options: [
          'Bản đồ chỉ đường',
          'Công trình hoặc địa điểm nổi tiếng, dễ nhận biết',
          'Phí đặt cọc khách sạn',
          'Ngôn ngữ địa phương',
        ],
        answer: 'Công trình hoặc địa điểm nổi tiếng, dễ nhận biết',
        explanation:
          'Landmark = a building or feature easily seen and recognized; famous place.',
      },
      {
        order: 15,
        question: '"Culture shock" là:',
        options: [
          'Chương trình văn hóa trên TV',
          'Cảm giác bất ngờ, bỡ ngỡ khi tiếp xúc với văn hóa xa lạ',
          'Lớp học về nghệ thuật địa phương',
          'Lễ hội văn hóa lớn',
        ],
        answer: 'Cảm giác bất ngờ, bỡ ngỡ khi tiếp xúc với văn hóa xa lạ',
        explanation:
          'Culture shock = disorientation experienced when encountering an unfamiliar culture.',
      },
      {
        order: 16,
        question: '"Visa on arrival" là:',
        options: [
          'Visa cần xin trước từ đại sứ quán',
          'Visa cấp ngay khi đến tại sân bay/cửa khẩu',
          'Visa du lịch dài hạn',
          'Miễn visa cho du khách',
        ],
        answer: 'Visa cấp ngay khi đến tại sân bay/cửa khẩu',
        explanation:
          'Visa on arrival = a visa issued to travellers upon arriving at the destination.',
      },
      {
        order: 17,
        question:
          'Điền từ: "The city is known for its ___ cuisine, which blends local and international flavours."',
        options: ['bland', 'fusion', 'simple', 'expired'],
        answer: 'fusion',
        explanation:
          'Fusion cuisine = cooking that combines elements of different culinary traditions.',
      },
      {
        order: 18,
        question: '"Hostel" khác "hotel" ở điểm gì?',
        options: [
          'Hostel là khách sạn 5 sao',
          'Hostel thường rẻ hơn, có phòng ngủ tập thể',
          'Hostel chỉ dành cho người cao tuổi',
          'Hostel không có chỗ ngủ qua đêm',
        ],
        answer: 'Hostel thường rẻ hơn, có phòng ngủ tập thể',
        explanation:
          'Hostel = budget accommodation typically offering dormitory-style rooms.',
      },
      {
        order: 19,
        question: '"Off the beaten track" có nghĩa là:',
        options: [
          'Đường đua chính thức',
          'Địa điểm ít người biết, hẻo lánh',
          'Lịch trình đã được lên kế hoạch',
          'Tour du lịch đông khách',
        ],
        answer: 'Địa điểm ít người biết, hẻo lánh',
        explanation:
          'Off the beaten track = away from the tourist trail; unfamiliar locations.',
      },
      {
        order: 20,
        question: '"Customs" trong sân bay đề cập đến:',
        options: [
          'Phong tục tập quán địa phương',
          'Cơ quan kiểm tra hàng hoá khi vào/ra quốc gia',
          'Dịch vụ hành lý',
          'Khu vực check-in',
        ],
        answer: 'Cơ quan kiểm tra hàng hoá khi vào/ra quốc gia',
        explanation:
          'Customs = the official process of checking goods entering or leaving a country.',
      },
    ],
    readingQuestion: {
      order: 21,
      title: 'Bài đọc: Sustainable Tourism',
      passage:
        'Sustainable tourism is becoming increasingly [BLANK1] as travellers become more aware of their environmental impact. Traditional mass tourism has [BLANK2] significant damage to natural ecosystems and local communities. In response, many destinations are now [BLANK3] stricter regulations on visitor numbers. Eco-tourism initiatives [BLANK4] local economies while preserving cultural heritage. Responsible travellers are encouraged to [BLANK5] local businesses and minimise their carbon [BLANK6] by choosing greener transport options.',
      blanks: [
        {
          label: 'BLANK1',
          options: ['irrelevant', 'important', 'expensive', 'complicated'],
          answer: 'important',
        },
        {
          label: 'BLANK2',
          options: ['prevented', 'caused', 'healed', 'ignored'],
          answer: 'caused',
        },
        {
          label: 'BLANK3',
          options: ['relaxing', 'removing', 'implementing', 'avoiding'],
          answer: 'implementing',
        },
        {
          label: 'BLANK4',
          options: ['destroy', 'support', 'ignore', 'compete with'],
          answer: 'support',
        },
        {
          label: 'BLANK5',
          options: ['avoid', 'support', 'criticise', 'replace'],
          answer: 'support',
        },
        {
          label: 'BLANK6',
          options: ['benefit', 'footprint', 'revenue', 'credit'],
          answer: 'footprint',
        },
      ],
    },
  });
  console.log('✅ Quiz 3: Travel & Culture');

  console.log(
    '\n🎉 Seed completed! Created:',
    [
      'admin',
      'testUser',
      ...Object.values(topics).map((t: any) => t.name),
      'Quiz 1',
      'Quiz 2',
      'Quiz 3',
    ].join(', '),
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
