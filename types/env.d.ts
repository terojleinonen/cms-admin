// Environment variable types

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly NODE_ENV: 'development' | 'production' | 'test';
      readonly DATABASE_URL: string;
      readonly NEXTAUTH_SECRET: string;
      readonly NEXTAUTH_URL: string;
      readonly POSTGRES_USER?: string;
      readonly POSTGRES_PASSWORD?: string;
      readonly POSTGRES_DB?: string;
    }
  }
}

export {};
