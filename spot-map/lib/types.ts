export type Category = 'claw_machine' | 'bathhouse';

// Claw machine specific attributes
export type ClawMachineAttributes = {
  machineCount: number | null;
  dollTypes: string;
  pricePerPlay: number | null;
  winProbability: string;
};

// Claw machine review attributes
export type ClawMachineReviewAttributes = {
  triesCount: number | null;
  dollTypes: string;
};

export type SpotAttributes = ClawMachineAttributes;
export type ReviewAttributes = ClawMachineReviewAttributes;

export type SpotSummary = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: Category;
  attributes: SpotAttributes;
  avgRating: number | null;
  reviewCount: number;
  createdAt: string;
};

export type ReviewItem = {
  id: string;
  rating: number;
  comment: string | null;
  attributes: ReviewAttributes;
  createdAt: string;
};

export type SpotDetail = SpotSummary & {
  reviews: ReviewItem[];
};
