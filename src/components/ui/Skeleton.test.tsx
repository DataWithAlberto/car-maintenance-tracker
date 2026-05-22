import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SkeletonRow } from './Skeleton';

describe('SkeletonRow', () => {
  it('renderiza los marcadores de carga', () => {
    const { container } = render(<SkeletonRow />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
  });
});
