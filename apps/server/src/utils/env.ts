export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  kakaoClientId: process.env.KAKAO_CLIENT_ID,
  kakaoRedirectUri: process.env.KAKAO_REDIRECT_URI,
  jwtSecret: process.env.JWT_SECRET,
  cookieDomain: process.env.COOKIE_DOMAIN,
  cookieSecure: process.env.COOKIE_SECURE === 'true',
};
