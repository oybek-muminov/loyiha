'use client';

import { useParams } from 'next/navigation';
import { LessonScreen } from '../../_components/lesson-screen';

export default function LessonPage() {
  const params = useParams<{ id: string }>();
  return <LessonScreen lessonId={params.id} />;
}
