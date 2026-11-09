/**
 * Demo Fizika kontenti.
 *
 * Ishlatish:
 *   pnpm db:seed
 *
 * Skript avval `fizika` fanini (va unga bog'liq dars/testlarni) o'chiradi,
 * keyin qaytadan yaratadi. Boshqa fanlarga tegmaydi.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type OptionSeed = [label: string, body: string, isCorrect: boolean];

async function createSingle(
  subjectId: string,
  topic: string,
  body: string,
  options: OptionSeed[],
  explanation: string,
) {
  return prisma.item.create({
    data: {
      subjectId,
      topic,
      type: 'single',
      body,
      explanation,
      options: {
        create: options.map(([label, text, isCorrect], index) => ({
          label,
          body: text,
          isCorrect,
          order: index + 1,
        })),
      },
    },
  });
}

async function createMulti(
  subjectId: string,
  topic: string,
  body: string,
  options: OptionSeed[],
  explanation: string,
) {
  return prisma.item.create({
    data: {
      subjectId,
      topic,
      type: 'multi',
      body,
      explanation,
      options: {
        create: options.map(([label, text, isCorrect], index) => ({
          label,
          body: text,
          isCorrect,
          order: index + 1,
        })),
      },
    },
  });
}

async function createNumeric(
  subjectId: string,
  topic: string,
  body: string,
  answer: number,
  tolerance: number,
  unit: string,
  explanation: string,
) {
  return prisma.item.create({
    data: {
      subjectId,
      topic,
      type: 'numeric',
      body,
      explanation,
      numeric: {
        create: {
          answer,
          tolerance,
          unit,
          unitRequired: true,
        },
      },
    },
  });
}

async function createOpen(
  subjectId: string,
  topic: string,
  body: string,
  keywords: Array<{ keyword: string; weight: number; isRequired: boolean }>,
  explanation: string,
) {
  return prisma.item.create({
    data: {
      subjectId,
      topic,
      type: 'open',
      body,
      explanation,
      keywords: { create: keywords },
    },
  });
}

async function createLesson(
  title: string,
  contentMd: string,
  durationSec: number,
) {
  return prisma.lesson.create({
    data: { title, contentMd, durationSec },
  });
}

async function main(): Promise<void> {
  console.log('Seed: eski fizika kontenti tozalanmoqda...');

  await prisma.subject.deleteMany({ where: { slug: 'fizika' } });
  await prisma.lesson.deleteMany({ where: { node: { is: null } } });
  await prisma.quiz.deleteMany({ where: { nodes: { none: {} } } });

  console.log('Seed: fan va kurs yaratilmoqda...');

  const subject = await prisma.subject.create({
    data: { slug: 'fizika', title: 'Fizika', order: 1, active: true },
  });

  const course = await prisma.course.create({
    data: {
      subjectId: subject.id,
      title: 'Fizika — milliy sertifikat va DTM',
      status: 'published',
    },
  });

  // --- 1-bo'lim: Kinematika -------------------------------------------------

  const kinematika = await prisma.unit.create({
    data: { courseId: course.id, title: 'Kinematika', order: 1 },
  });

  const l1 = await createLesson(
    'Kinematika asoslari',
    [
      '# Kinematika asoslari',
      '',
      'Kinematika — jismlar harakatini sabablarini o‘rganmasdan tavsiflaydi.',
      '',
      '$$ v = \\frac{s}{t} $$',
      '',
      '**Asosiy kattaliklar:** yo‘l, ko‘chish, tezlik, tezlanish.',
      '',
      '> Tezlik — vektor kattalik, yo‘l esa skalyar.',
    ].join('\n'),
    600,
  );

  const l2 = await createLesson(
    'Tekis harakat',
    [
      '# Tekis harakat',
      '',
      'Tekis harakatda tezlik o‘zgarmaydi:',
      '',
      '$$ s = v \\cdot t $$',
      '',
      'Misol: 20 m/s tezlik bilan 5 s da bosib o‘tilgan yo‘l:',
      '',
      '$$ s = 20 \\cdot 5 = 100\\ \\text{m} $$',
    ].join('\n'),
    540,
  );

  const l3 = await createLesson(
    'Tezlanish',
    [
      '# Tezlanish',
      '',
      'Tezlanish — tezlikning vaqt bo‘yicha o‘zgarish tezligi:',
      '',
      '$$ a = \\frac{\\Delta v}{\\Delta t} $$',
      '',
      'Birligi: **m/s²**.',
    ].join('\n'),
    660,
  );

  const l4 = await createLesson(
    'Nyuton qonunlari',
    [
      '# Nyuton qonunlari',
      '',
      '1. Inersiya qonuni — tashqi kuch ta’sir etmasa, jism holatini saqlaydi.',
      '2. $$ F = m a $$',
      '3. Har bir ta’sirga teng va qarama-qarshi aks ta’sir mavjud.',
    ].join('\n'),
    720,
  );

  const l5 = await createLesson(
    'Kuch va massa',
    [
      '# Kuch va massa',
      '',
      'Og‘irlik kuchi:',
      '',
      '$$ P = m g $$',
      '',
      'Bu yerda $g \\approx 9.8\\ \\text{m/s}^2$.',
    ].join('\n'),
    600,
  );

  // --- Savollar -------------------------------------------------------------

  const k1 = await createSingle(
    subject.id,
    'Kinematika',
    'Jism 20 m/s tezlik bilan 5 s yurdi. Bosib o‘tgan yo‘lni toping.',
    [
      ['A', '4 m', false],
      ['B', '25 m', false],
      ['C', '100 m', true],
      ['D', '80 m', false],
    ],
    's = v·t = 20·5 = 100 m',
  );

  const k2 = await createNumeric(
    subject.id,
    'Kinematika',
    'Erkin tushish tezlanishini toping.',
    9.8,
    0.15,
    'm/s²',
    'g ≈ 9.8 m/s²',
  );

  const k3 = await createSingle(
    subject.id,
    'Kinematika',
    'Tezlanish qanday birlikda o‘lchanadi?',
    [
      ['A', 'm/s', false],
      ['B', 'm/s²', true],
      ['C', 'm', false],
      ['D', 'N', false],
    ],
    'Tezlanish — m/s².',
  );

  const k4 = await createMulti(
    subject.id,
    'Kinematika',
    'Quyidagilardan qaysilari vektor kattaliklar?',
    [
      ['A', 'Tezlik', true],
      ['B', 'Yo‘l', false],
      ['C', 'Ko‘chish', true],
      ['D', 'Vaqt', false],
    ],
    'Tezlik va ko‘chish vektor; yo‘l va vaqt skalyar.',
  );

  const k5 = await createOpen(
    subject.id,
    'Dinamika',
    'Nyutonning ikkinchi qonunini tushuntiring.',
    [
      { keyword: 'F=ma|nyuton', weight: 2, isRequired: true },
      { keyword: 'kuch', weight: 1, isRequired: false },
      { keyword: 'massa', weight: 1, isRequired: false },
      { keyword: 'tezlanish|akseleratsiya', weight: 1, isRequired: false },
    ],
    'F = m·a: kuch massa va tezlanish ko‘paytmasiga teng.',
  );

  const k6 = await createNumeric(
    subject.id,
    'Kinematika',
    'Avtomobil 72 km/soat tezlikda 10 s yurdi. Bosib o‘tgan yo‘lni metrda toping.',
    200,
    0.5,
    'm',
    '72 km/soat = 20 m/s; s = 20·10 = 200 m.',
  );

  const d1 = await createSingle(
    subject.id,
    'Dinamika',
    'Nyutonning birinchi qonuni qanday nomlanadi?',
    [
      ['A', 'Inersiya qonuni', true],
      ['B', 'Harakat qonuni', false],
      ['C', 'Og‘irlik qonuni', false],
      ['D', 'Energiya qonuni', false],
    ],
    'Birinchi qonun — inersiya qonuni.',
  );

  const d2 = await createNumeric(
    subject.id,
    'Dinamika',
    'Massasi 2 kg jismga 10 N kuch ta’sir etsa, tezlanishi qancha?',
    5,
    0.1,
    'm/s²',
    'a = F/m = 10/2 = 5 m/s².',
  );

  const d3 = await createMulti(
    subject.id,
    'Dinamika',
    'Quyidagilardan qaysilari kuch birligi hisoblanadi?',
    [
      ['A', 'N', true],
      ['B', 'kN', true],
      ['C', 'J', false],
      ['D', 'kg', false],
    ],
    'Nyuton (N) va kilonyuton (kN) — kuch birliklari.',
  );

  const d4 = await createOpen(
    subject.id,
    'Dinamika',
    'Inersiya nima?',
    [
      { keyword: 'inersiya', weight: 2, isRequired: true },
      { keyword: 'tashqi kuch', weight: 1, isRequired: false },
      { keyword: 'saqlan|o‘zgarmaydi|ozgarmaydi', weight: 1, isRequired: false },
    ],
    'Inersiya — tashqi kuch bo‘lmaganda jism holatini saqlash xossasi.',
  );

  const d5 = await createSingle(
    subject.id,
    'Dinamika',
    'Og‘irlik kuchi qaysi formula bilan topiladi?',
    [
      ['A', 'F = ma', false],
      ['B', 'P = mg', true],
      ['C', 'F = kx', false],
      ['D', 'A = F/s', false],
    ],
    'Og‘irlik kuchi P = m·g.',
  );

  // --- Testlar --------------------------------------------------------------

  const q1 = await prisma.quiz.create({
    data: {
      title: 'Kinematika — nazorat ishi',
      kind: 'checkpoint',
      items: {
        create: [k1, k2, k3, k4, k5, k6].map((item, index) => ({
          itemId: item.id,
          order: index + 1,
        })),
      },
    },
  });

  const q2 = await prisma.quiz.create({
    data: {
      title: 'Dinamika — nazorat ishi',
      kind: 'checkpoint',
      items: {
        create: [d1, d2, d3, d4, d5].map((item, index) => ({
          itemId: item.id,
          order: index + 1,
        })),
      },
    },
  });

  const q3 = await prisma.quiz.create({
    data: {
      title: 'Tezlanish — mashq',
      kind: 'micro',
      items: {
        create: [k3, k6].map((item, index) => ({
          itemId: item.id,
          order: index + 1,
        })),
      },
    },
  });

  // --- Node'lar -------------------------------------------------------------

  await prisma.node.createMany({
    data: [
      {
        unitId: kinematika.id,
        type: 'lesson',
        title: l1.title,
        order: 1,
        lessonId: l1.id,
      },
      {
        unitId: kinematika.id,
        type: 'lesson',
        title: l2.title,
        order: 2,
        lessonId: l2.id,
      },
      {
        unitId: kinematika.id,
        type: 'lesson',
        title: l3.title,
        order: 3,
        lessonId: l3.id,
      },
      {
        unitId: kinematika.id,
        type: 'quiz',
        title: q3.title,
        order: 4,
        quizId: q3.id,
      },
      {
        unitId: kinematika.id,
        type: 'checkpoint',
        title: q1.title,
        order: 5,
        quizId: q1.id,
      },
    ],
  });

  // --- 2-bo'lim: Dinamika ---------------------------------------------------

  const dinamika = await prisma.unit.create({
    data: { courseId: course.id, title: 'Dinamika', order: 2 },
  });

  await prisma.node.createMany({
    data: [
      {
        unitId: dinamika.id,
        type: 'lesson',
        title: l4.title,
        order: 1,
        lessonId: l4.id,
      },
      {
        unitId: dinamika.id,
        type: 'lesson',
        title: l5.title,
        order: 2,
        lessonId: l5.id,
      },
      {
        unitId: dinamika.id,
        type: 'checkpoint',
        title: q2.title,
        order: 3,
        quizId: q2.id,
      },
    ],
  });

  console.log('Seed tayyor:');
  console.log('  fan:        fizika');
  console.log('  darslar:    5');
  console.log('  testlar:    3 (11 savol)');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
