export const config = {
  port: Number(process.env.PORT) || 8790,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'fisaval-dev-secret-trocar-em-producao',
  jwtExpires: process.env.JWT_EXPIRES || '7d',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
};

export const usePostgres = () => !!config.databaseUrl;
