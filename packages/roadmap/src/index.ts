export type NodeType = 'lesson' | 'quiz' | 'checkpoint';

export type NodeState = 'locked' | 'available' | 'in_progress' | 'completed';

export interface PathNodeInput {
  id: string;
  order: number;
  type: NodeType;
  completed: boolean;
  /** Foydalanuvchi ochib, tugatmagan bo'lsa */
  started?: boolean;
}

export interface NodeStateResult {
  id: string;
  type: NodeType;
  order: number;
  state: NodeState;
}

/**
 * Chiziqli yo'l uchun holatlarni hisoblaydi.
 *
 * Qoida: node faqat undan oldingi barcha node'lar tugagach ochiladi.
 * `checkpoint` ham xuddi shu qoidaga bo'ysunadi.
 */
export function computeNodeStates(
  nodes: readonly PathNodeInput[],
): NodeStateResult[] {
  const sorted = [...nodes].sort((a, b) => a.order - b.order);

  const result: NodeStateResult[] = [];
  let previousAllCompleted = true;

  for (const node of sorted) {
    let state: NodeState;

    if (node.completed) {
      state = 'completed';
    } else if (previousAllCompleted) {
      state = node.started ? 'in_progress' : 'available';
    } else {
      state = 'locked';
    }

    result.push({
      id: node.id,
      type: node.type,
      order: node.order,
      state,
    });

    previousAllCompleted = previousAllCompleted && node.completed;
  }

  return result;
}

export function computeProgress(
  nodes: readonly Pick<PathNodeInput, 'completed'>[],
): number {
  if (nodes.length === 0) return 0;
  const completed = nodes.filter((n) => n.completed).length;
  return completed / nodes.length;
}

/**
 * Foydalanuvchi davom ettirishi kerak bo'lgan keyingi node.
 * `available` yoki `in_progress` holatidagi birinchi node.
 */
export function nextNode(
  nodes: readonly PathNodeInput[],
): NodeStateResult | null {
  const states = computeNodeStates(nodes);
  return (
    states.find((n) => n.state === 'in_progress') ??
    states.find((n) => n.state === 'available') ??
    null
  );
}

/**
 * Checkpoint oldingi bo'lim darslarining kamida `threshold` qismi
 * tugagach ochiladi (default 70%).
 */
export function isCheckpointUnlocked(
  previousLessons: readonly Pick<PathNodeInput, 'completed' | 'type'>[],
  threshold = 0.7,
): boolean {
  const lessons = previousLessons.filter((n) => n.type === 'lesson');
  if (lessons.length === 0) return true;
  return computeProgress(lessons) >= threshold;
}
