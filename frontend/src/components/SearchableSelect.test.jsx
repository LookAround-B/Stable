import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import SearchableSelect from './SearchableSelect';

const baseProps = {
  name: 'horseId',
  value: '',
  onChange: () => {},
  placeholder: 'Select horse',
  options: [
    { value: '1', label: 'Alpha' },
    { value: '2', label: 'Bravo' },
    { value: '3', label: 'Charlie' },
    { value: '4', label: 'Delta' },
    { value: '5', label: 'Echo' },
    { value: '6', label: 'Foxtrot' },
  ],
};

const ToggleHarness = () => {
  const [visible, setVisible] = useState(true);

  return (
    <div>
      <button type="button" onClick={() => setVisible(false)}>
        Close Select
      </button>
      {visible ? <SearchableSelect {...baseProps} /> : null}
    </div>
  );
};

describe('SearchableSelect', () => {
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

  it('renders the dropdown inside a dedicated body portal and cleans it up on unmount', () => {
    act(() => {
      root.render(<SearchableSelect {...baseProps} />);
    });

    const trigger = container.querySelector('.efm-searchable-select button');

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const portalNode = document.body.querySelector('[data-searchable-select-portal="true"]');

    expect(portalNode).not.toBeNull();
    expect(portalNode.textContent).toContain('Alpha');
    expect(portalNode.querySelector('input[placeholder="Search..."]')).not.toBeNull();

    act(() => {
      root.unmount();
    });

    expect(document.body.querySelector('[data-searchable-select-portal="true"]')).toBeNull();
    root = createRoot(container);
  });

  it('does not leave a body dropdown behind when the parent closes while the menu is open', () => {
    act(() => {
      root.render(<ToggleHarness />);
    });

    const trigger = container.querySelector('.efm-searchable-select button');

    act(() => {
      trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Alpha');

    act(() => {
      container.querySelector('button').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.querySelector('[data-searchable-select-portal="true"]')).toBeNull();
    expect(document.body.textContent).not.toContain('Alpha');
  });
});
