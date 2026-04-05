export interface BagEssentials {
  potions: {
    small: number;
    greater: number;
    superior: number;
    supreme: number;
  };
  goodberries: number;
  currency: {
    gold: number;
    silver: number;
    platinum: number;
  };
  components: {
    diamonds: number;
    revivify_packs: number;
  };
}

export const DEFAULT_BAG_ESSENTIALS: BagEssentials = {
  potions: { small: 0, greater: 0, superior: 0, supreme: 0 },
  goodberries: 0,
  currency: { gold: 0, silver: 0, platinum: 0 },
  components: { diamonds: 0, revivify_packs: 0 },
};
