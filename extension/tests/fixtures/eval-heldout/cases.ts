import type { HeldoutCase } from './case-types';
import {
  H01,
  H02,
  H03,
  H04,
  H05,
  H06,
  H07,
  H08,
  H09,
  H10,
  H11,
  H12,
  H13,
  H14,
  H15,
} from './cases-h01-h15';
import {
  H16,
  H17,
  H18,
  H19,
  H20,
  H21,
  H22,
  H23,
  H24,
  H25,
  H26,
  H27,
  H28,
  H29,
  H30,
} from './cases-h16-h30';
import {
  N01,
  N02,
  N03,
  N04,
  N05,
  N06,
  N07,
  N08,
  N09,
  N10,
  N11,
  N12,
  N13,
  N14,
  N15,
  N16,
  N17,
  N18,
  N19,
  N20,
} from './cases-n01-n20';

/**
 * Bộ giữ kín 50 mẫu (TASK 03): 30 dương H01–H30 + 20 âm N01–N20.
 * Freeze TRƯỚC lần đo đầu tiên — xem PROVENANCE.md cùng thư mục.
 */
export const HELDOUT_POSITIVE: HeldoutCase[] = [
  H01, H02, H03, H04, H05, H06, H07, H08, H09, H10,
  H11, H12, H13, H14, H15, H16, H17, H18, H19, H20,
  H21, H22, H23, H24, H25, H26, H27, H28, H29, H30,
];
export const HELDOUT_NEGATIVE: HeldoutCase[] = [
  N01, N02, N03, N04, N05, N06, N07, N08, N09, N10,
  N11, N12, N13, N14, N15, N16, N17, N18, N19, N20,
];
export const HELDOUT_CASES: HeldoutCase[] = [...HELDOUT_POSITIVE, ...HELDOUT_NEGATIVE];
