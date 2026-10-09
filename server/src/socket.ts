import { Server } from 'socket.io';

export function setupSocketHandlers(io: Server) {
  io.on('connection', socket => {
    socket.on('join-auction', (id: string) => { if (typeof id === 'string') socket.join('auction:' + id); });
    socket.on('leave-auction', (id: string) => { if (typeof id === 'string') socket.leave('auction:' + id); });
    socket.on('place-bid', () => socket.emit('bid-error', { message: 'Use the authenticated bidding API.' }));
  });
}
