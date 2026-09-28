export interface ServerConfig { host: string; port: number; origins: string[]; maxBodyBytes: number }
export function serverConfig(env = process.env): ServerConfig {
  const port = Number(env.PORT ?? 8000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('PORT invalide');
  const configuredOrigins = env.FRONTEND_ORIGIN ?? env.CLIENT_ORIGINS ?? 'http://127.0.0.1:3000,http://localhost:3000';
  return { host: env.HOST ?? '127.0.0.1', port,
    origins: configuredOrigins.split(',').map(s => s.trim()).filter(Boolean),
    maxBodyBytes: 4 * 1024 * 1024 };
}
