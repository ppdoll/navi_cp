import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('local', 'live', 'development', 'production', 'test')
    .optional(),
  PORT: Joi.number().port().optional(),
  HTTP_TIMEOUT_MS: Joi.number().integer().min(1000).optional(),
  DIRECTION_CACHE_TTL_SECONDS: Joi.number().integer().min(1).optional(),
  NAVER_MAP_API_KEY_ID: Joi.string().allow('').optional(),
  NAVER_MAP_API_KEY: Joi.string().allow('').optional(),
  KAKAO_MAP_API_KEY: Joi.string().allow('').optional(),
  TMAP_API_KEY: Joi.string().allow('').optional(),
  NAVER_DIRECTION_API_URL: Joi.string().uri().allow('').optional(),
  KAKAO_DIRECTION_API_URL: Joi.string().uri().allow('').optional(),
  TMAP_DIRECTION_API_URL: Joi.string().uri().allow('').optional(),
});
