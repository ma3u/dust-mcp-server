import { Redis as IORedis } from 'ioredis';

declare module 'ioredis' {
  interface Redis extends IORedis {}
}

export {};
