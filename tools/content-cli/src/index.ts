#!/usr/bin/env node
/**
 * UniverAcademy kontent CLI.
 *
 * Hozircha faqat `validate` buyrug'i ishlaydi:
 *   pnpm content:validate ./content/fizika
 *
 * Tekshiradi:
 *   - har dars papkasida lesson.md borligi
 *   - markdown ichidagi rasmlar mavjudligi
 *   - video fayl borligi (ogohlantirish)
 *   - test fayllari (tests.docx) mavjudligi
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

interface LessonReport {
  dir: string;
  hasVideo: boolean;
  imageCount: number;
  missingImages: string[];
}

interface ValidationResult {
  lessons: LessonReport[];
  testFiles: string[];
  errors: string[];
  warnings: string[];
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist']);

async function findLessonDirs(root: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    const names = entries.map((entry) => entry.name);

    if (names.includes('lesson.md')) {
      found.push(dir);
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name));
    }
  }

  await walk(root);
  found.sort();
  return found;
}

async function findTestFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name));
      } else if (/\.(docx|json)$/i.test(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  }

  await walk(root);
  files.sort();
  return files;
}

const IMAGE_PATTERN = /!\[[^\]]*\]\(([^)\s]+)\)/g;

async function inspectLesson(dir: string): Promise<LessonReport> {
  const markdown = await readFile(path.join(dir, 'lesson.md'), 'utf8');

  const imageRefs = new Set<string>();
  for (const match of markdown.matchAll(IMAGE_PATTERN)) {
    const ref = match[1];
    if (!ref) continue;
    if (/^https?:\/\//i.test(ref)) continue;
    imageRefs.add(ref.replace(/^\.\//, ''));
  }

  const missingImages: string[] = [];
  for (const ref of imageRefs) {
    const absolute = path.join(dir, ref);
    if (!existsSync(absolute)) {
      missingImages.push(ref);
    }
  }

  return {
    dir,
    hasVideo: existsSync(path.join(dir, 'lesson.mp4')),
    imageCount: imageRefs.size,
    missingImages,
  };
}

async function validate(root: string): Promise<ValidationResult> {
  const lessonDirs = await findLessonDirs(root);

  if (lessonDirs.length === 0) {
    return {
      lessons: [],
      testFiles: [],
      errors: [`${root} ichida lesson.md topilmadi`],
      warnings: [],
    };
  }

  const lessons = await Promise.all(lessonDirs.map(inspectLesson));
  const testFiles = await findTestFiles(root);

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const lesson of lessons) {
    const relative = path.relative(root, lesson.dir);

    for (const image of lesson.missingImages) {
      errors.push(`[${relative}] rasm topilmadi: ${image}`);
    }

    if (!lesson.hasVideo) {
      warnings.push(`[${relative}] lesson.mp4 yo'q (keyin qo'shish mumkin)`);
    }
  }

  return { lessons, testFiles, errors, warnings };
}

function printReport(root: string, result: ValidationResult): void {
  const imageTotal = result.lessons.reduce(
    (sum, lesson) => sum + lesson.imageCount,
    0,
  );

  console.log('');
  console.log('UniverAcademy — kontent tekshiruvi');
  console.log(`Papka:  ${root}`);
  console.log(`Darslar: ${result.lessons.length}`);
  console.log(`Rasmlar: ${imageTotal}`);
  console.log(`Test fayllar: ${result.testFiles.length}`);
  console.log('');

  if (result.errors.length > 0) {
    console.log(`Xatolar (${result.errors.length}):`);
    for (const error of result.errors) {
      console.log(`  ✗ ${error}`);
    }
    console.log('');
  }

  if (result.warnings.length > 0) {
    console.log(`Ogohlantirishlar (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      console.log(`  ⚠ ${warning}`);
    }
    console.log('');
  }

  if (result.errors.length === 0) {
    console.log('Natija: TAYYOR ✓');
  } else {
    console.log(`Natija: XATO (${result.errors.length})`);
  }
}

async function main(): Promise<void> {
  const [, , command, target] = process.argv;

  if (command !== 'validate') {
    console.log('Foydalanish:');
    console.log('  pnpm content:validate ./content/fizika');
    process.exitCode = 1;
    return;
  }

  const root = path.resolve(target ?? 'content');

  if (!existsSync(root)) {
    console.error(`Papka topilmadi: ${root}`);
    process.exitCode = 1;
    return;
  }

  const result = await validate(root);
  printReport(root, result);

  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}

void main();
