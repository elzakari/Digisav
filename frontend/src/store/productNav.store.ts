import { create } from 'zustand';

export type SavingsProduct = 'group' | 'micro';

type ProductNavState = {
  product: SavingsProduct;
  setProduct: (product: SavingsProduct) => void;
};

export const useProductNavStore = create<ProductNavState>((set) => ({
  product: 'group',
  setProduct: (product) => set({ product }),
}));

