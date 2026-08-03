import { describe, it, expect } from 'vitest';
import { computeNodeStatusAndProgress } from './lifemapDerivation';
import { LifeMapNode } from '../types/lifemap';

describe('lifemapDerivation', () => {
    it('calculates correct status and progress for a milestone with done, dropped, and not_started tasks', () => {
        const nodes: LifeMapNode[] = [
            {
                id: 'm-1',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: {
                    label: 'Test Milestone',
                    tasks: [
                        { id: 't1', text: 'Task 1', completed: true, status: 'done' },
                        { id: 't2', text: 'Task 2', completed: false, status: 'dropped' },
                        { id: 't3', text: 'Task 3', completed: false, status: 'not_started' },
                    ]
                }
            }
        ];

        const { status, progress } = computeNodeStatusAndProgress('m-1', nodes);
        
        expect(status).toBe('not_started');
        expect(progress).toBe(50); // 1 done / (3 total - 1 dropped) = 1 / 2 = 50%
    });

    it('returns not_started and null progress for a milestone with zero tasks', () => {
        const nodes: LifeMapNode[] = [
            {
                id: 'm-2',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: {
                    label: 'Empty Milestone',
                    tasks: []
                }
            }
        ];

        const { status, progress } = computeNodeStatusAndProgress('m-2', nodes);
        
        expect(status).toBe('not_started');
        expect(progress).toBeNull();
    });

    it('returns blocked if any child is blocked and none in_progress', () => {
        const nodes: LifeMapNode[] = [
            {
                id: 'p-1',
                type: 'project',
                position: { x: 0, y: 0 },
                data: { label: 'Project 1' }
            },
            {
                id: 'm-1',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: { parentId: 'p-1', label: 'M1', manual_status_override: 'blocked' }
            },
            {
                id: 'm-2',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: { parentId: 'p-1', label: 'M2', manual_status_override: 'not_started' }
            }
        ];

        const { status } = computeNodeStatusAndProgress('p-1', nodes);
        expect(status).toBe('blocked');
    });

    it('returns in_progress if any child is in_progress, even if another is blocked', () => {
        const nodes: LifeMapNode[] = [
            {
                id: 'p-1',
                type: 'project',
                position: { x: 0, y: 0 },
                data: { label: 'Project 1' }
            },
            {
                id: 'm-1',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: { parentId: 'p-1', label: 'M1', manual_status_override: 'blocked' }
            },
            {
                id: 'm-2',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: { parentId: 'p-1', label: 'M2', manual_status_override: 'in_progress' }
            }
        ];

        const { status } = computeNodeStatusAndProgress('p-1', nodes);
        expect(status).toBe('in_progress');
    });

    it('respects manual_status_override over derived status', () => {
        const nodes: LifeMapNode[] = [
            {
                id: 'm-1',
                type: 'milestone',
                position: { x: 0, y: 0 },
                data: {
                    label: 'Milestone 1',
                    manual_status_override: 'parked',
                    tasks: [
                        { id: 't1', text: 'Task 1', completed: false, status: 'in_progress' }
                    ]
                }
            }
        ];

        const { status } = computeNodeStatusAndProgress('m-1', nodes);
        // Derived would be 'in_progress', but override is 'parked'
        expect(status).toBe('parked');
    });
});
