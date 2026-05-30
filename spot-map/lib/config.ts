import { Category } from './types';

export type SiteConfig = {
  category: Category;
  siteName: string;
  siteSubtitle: string;
  spotLabel: string;
  attributeLabels: {
    machineCount: string;
    dollTypes: string;
    pricePerPlay: string;
    winProbability: string;
  };
  reviewAttributeLabels: {
    triesCount: string;
    dollTypes: string;
  };
  winProbabilityOptions: string[];
  mapCenter: [number, number];
  mapZoom: number;
};

export const SITE_CONFIG: SiteConfig = {
  category: 'claw_machine',
  siteName: '인형뽑기 성지',
  siteSubtitle: '전국 인형뽑기방 지도',
  spotLabel: '인형뽑기방',
  attributeLabels: {
    machineCount: '기계 대수',
    dollTypes: '인형 종류',
    pricePerPlay: '1판 가격',
    winProbability: '뽑힐 확률',
  },
  reviewAttributeLabels: {
    triesCount: '몇 판 만에 뽑았나요?',
    dollTypes: '뽑은 인형 종류',
  },
  winProbabilityOptions: ['매우 쉬움 (5판 내외)', '쉬움 (10판 내외)', '보통 (20판 내외)', '어려움 (30판 이상)', '매우 어려움'],
  mapCenter: [36.5, 127.5],
  mapZoom: 7,
};
