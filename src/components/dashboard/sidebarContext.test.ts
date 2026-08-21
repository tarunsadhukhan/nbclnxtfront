import { describe, expect, it } from 'vitest';
import { computeParentMenus, type MenuItem } from './sidebarContext';

const menu = (menu_id: number, menu_parent_id: number | null, menu_name = `m${menu_id}`): MenuItem =>
  ({ menu_id, menu_name, menu_path: `p${menu_id}`, menu_parent_id });

describe('computeParentMenus', () => {
  it('keeps only true roots', () => {
    const roots = computeParentMenus([menu(1, null), menu(2, 1), menu(3, 2)]);
    expect(roots.map(m => m.menu_id)).toEqual([1]);
  });

  it('hides orphans whose parent grant was removed', () => {
    // Procurement (1) un-granted; its report hub (2) and report leaves (3,4) remain.
    const roots = computeParentMenus([menu(9, null, 'Masters'), menu(3, 2), menu(4, 2)]);
    expect(roots.map(m => m.menu_name)).toEqual(['Masters']);
  });

  it('treats menu_parent_id 0 as a root', () => {
    expect(computeParentMenus([menu(1, 0), menu(2, 1)]).map(m => m.menu_id)).toEqual([1]);
  });

  it('falls back to promoting orphans when pruning leaves nothing', () => {
    const roots = computeParentMenus([menu(3, 2), menu(4, 3)]);
    expect(roots.map(m => m.menu_id)).toEqual([3]);
  });
});
