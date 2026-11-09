'use client';

import { useParams } from 'next/navigation';
import { QuizScreen } from '../../_components/quiz-screen';

export default function QuizPage() {
  const params = useParams<{ id: string }>();
  return <QuizScreen quizId={params.id} />;
}
