import type estimate from './data/estimate.json';

export type Estimate = typeof estimate;
export type EstimateItem = Estimate['repair']['items'][number] & { link?: string };
export type ShoppingRow = Estimate['shopping'][number];
