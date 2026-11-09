import { describe, expect, it } from 'vitest';
import {
  computeNodeStates,
  computeProgress,
  isCheckpointUnlocked,
  nextNode,
  type PathNodeInput,
} from '../src/index';

const nodes: PathNodeInput[] = [
  { id: 'a', order: 1, type: 'lesson', completed: true },
  { id: 'b', order: 2, type: 'lesson', completed: false },
  { id: 'c', order: 3, type: 'lesson', completed: false },
  { id: 'd', order: 4, type: 'checkpoint', completed: false },
];

describe('computeNodeStates', () => {
  it('first completed, second available, rest locked', () => {
    const states = computeNodeStates(nodes);
    expect(states.map((s) => s.state)).toEqual([
      'completed',
      'available',
      'locked',
      'locked',
    ]);
  });

  it('marks started node as in_progress', () => {
    const states = computeNodeStates([
      { id: 'a', order: 1, type: 'lesson', completed: true },
      { id: 'b', order: 2, type: 'lesson', completed: false, started: true },
    ]);
    expect(states[1]?.state).toBe('in_progress');
  });

  it('sorts by order regardless of input order', () => {
    const states = computeNodeStates([nodes[2]!, nodes[0]!, nodes[1]!]);
    expect(states.map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('empty input returns empty', () => {
    expect(computeNodeStates([])).toEqual([]);
  });
});

describe('computeProgress', () => {
  it('returns ratio', () => {
    expect(computeProgress(nodes)).toBe(0.25);
  });

  it('returns 0 for empty', () => {
    expect(computeProgress([])).toBe(0);
  });
});

describe('nextNode', () => {
  it('returns first available node', () => {
    expect(nextNode(nodes)?.id).toBe('b');
  });

  it('returns null when all completed', () => {
    const done = nodes.map((n) => ({ ...n, completed: true }));
    expect(nextNode(done)).toBeNull();
  });
});

describe('isCheckpointUnlocked', () => {
  it('requires threshold of lessons completed', () => {
    const lessons = [
      { type: 'lesson' as const, completed: true },
      { type: 'lesson' as const, completed: true },
      { type: 'lesson' as const, completed: false },
      { type: 'lesson' as const, completed: false },
    ];
    expect(isCheckpointUnlocked(lessons, 0.7)).toBe(false);
    expect(isCheckpointUnlocked(lessons, 0.5)).toBe(true);
  });

  it('unlocks when no lessons', () => {
    expect(isCheckpointUnlocked([])).toBe(true);
  });
});
