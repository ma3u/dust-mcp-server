// Simple SSE broadcaster utility for Express
import { Response } from 'express';

const clients: Response[] = [];

export function addClient(res: Response) {
  clients.push(res);
}

export function removeClient(res: Response) {
  const idx = clients.indexOf(res);
  if (idx !== -1) clients.splice(idx, 1);
}

export function broadcast(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(payload));
}

export function closeAll() {
  clients.forEach(res => res.end());
  clients.length = 0;
}
