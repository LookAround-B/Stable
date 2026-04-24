import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import TaskEvidenceReviewModal from './TaskEvidenceReviewModal';

const baseTask = {
  id: 'task-1',
  name: 'Arena clean-up',
  status: 'Pending Review',
  type: 'Cleaning',
  priority: 'High',
  completionNotes: 'Finished before the next riding slot.',
  completedTime: '2026-04-24T06:15:00.000Z',
};

describe('TaskEvidenceReviewModal', () => {
  let container;
  let root;

  beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('uses a viewport-centered scrollable shell so the review card stays on screen', () => {
    act(() => {
      root.render(
        <TaskEvidenceReviewModal
          task={baseTask}
          t={(value) => value}
          loading={false}
          assignedTo="Test Groom"
          horseName="Silver"
          statusColor="#22c55e"
          evidenceImage="/proof.jpg"
          evidenceImageSrc="/proof.jpg"
          onClose={() => {}}
          onApprove={() => {}}
          onReject={() => {}}
          onOpenFullscreen={() => {}}
        />
      );
    });

    const overlay = container.querySelector('[data-testid="task-evidence-review-overlay"]');
    const panel = container.querySelector('[data-testid="task-evidence-review-panel"]');

    expect(overlay).not.toBeNull();
    expect(panel).not.toBeNull();

    expect(overlay.className).toContain('overflow-y-auto');
    expect(overlay.className).toContain('items-start');
    expect(panel.className).toContain('my-auto');
    expect(panel.className).toContain('max-h-[calc(100dvh-5.5rem)]');
    expect(panel.className).not.toContain('top-1/2');
  });

  it('closes when the dimmed overlay is clicked', () => {
    const onClose = jest.fn();

    act(() => {
      root.render(
        <TaskEvidenceReviewModal
          task={baseTask}
          t={(value) => value}
          loading={false}
          assignedTo="Test Groom"
          horseName="Silver"
          statusColor="#22c55e"
          evidenceImage=""
          evidenceImageSrc=""
          onClose={onClose}
          onApprove={() => {}}
          onReject={() => {}}
          onOpenFullscreen={() => {}}
        />
      );
    });

    act(() => {
      container.querySelector('[data-testid="task-evidence-review-overlay"]').dispatchEvent(
        new MouseEvent('click', { bubbles: true })
      );
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
