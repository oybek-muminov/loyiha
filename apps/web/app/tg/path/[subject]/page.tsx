'use client';

import { useParams } from 'next/navigation';
import { PathScreen } from '../../_components/path-screen';

export default function SubjectPathPage() {
  const params = useParams<{ subject: string }>();
  return <PathScreen slug={params.subject} />;
}
