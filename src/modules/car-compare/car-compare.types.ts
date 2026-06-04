export type CarSource =
  | 'heydealer'
  | 'encar'
  | 'hyundai-certified'
  | 'kia-certified'
  | 'bmw-certified'
  | 'benz-certified'
  | 'unknown';

export interface CarListingNormalized {
  source: CarSource;
  sourceLabel: string;
  url: string;
  fetchedAt: string;
  supported: boolean;
  title: string | null;
  modelName: string | null;
  year: string | null;
  registrationDate: string | null;
  priceText: string | null;
  priceAmount: number | null;
  mileageText: string | null;
  mileageKm: number | null;
  accidentStatus: string | null;
  accidentHistory: string | null;
  fuel: string | null;
  transmission: string | null;
  color: string | null;
  drivetrain: string | null;
  bodyType: string | null;
  displacement: string | null;
  seller: string | null;
  location: string | null;
  plateNumber: string | null;
  warranty: string | null;
  imageUrl: string | null;
  options: string[];
  highlights: string[];
  specs: Record<string, string>;
  notes: string[];
}
