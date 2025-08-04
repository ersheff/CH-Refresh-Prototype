import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  try {
    const html = await readFile(`${__dirname}/public/index.html`, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } catch (err) {
    res.writeHead(404);
    res.end('Not found');
  }
});

const io = new Server(server);
const users = new Map();
const usersById = new Map();

//

io.on('connection', (socket) => {
  handleNewConnect(socket);

  socket.on('set-username', (username) => {
    setUsername(socket, username);
  });

  socket.on('msg', (incoming) => {
    handleMsg(socket, incoming);
  });

  socket.on('chat', (msg) => {
    io.emit('chat', { username: socket.data.username, msg });
  });

  socket.on('toggle-feed', (username) => {
    toggleFeed(socket, username);
  });

  socket.on('toggle-room', (room) => {
    toggleRoom(socket, room);
  });

  socket.on('create-room', (room) => {
    createRoom(socket, room);
  });

  socket.on('delete-room', (room) => {
    deleteRoom(room);
  });

  socket.on('disconnecting', () => {
    handleDisconnecting(socket);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

server.listen(PORT, () => {
  console.log('server running!');
});

//

function getRoomList() {
  const allRooms = Array.from(io.of('/').adapter.rooms.keys());
  return allRooms.filter(
    (room) => !io.of('/').sockets.has(room) && !room.startsWith('feed:')
  );
}

function getUserFeedList(socket) {
  const socketRooms = Array.from(socket.rooms);
  const feedRooms = socketRooms.filter(
    (room) => room.startsWith('feed:') && room !== `feed:${socket.id}`
  );
  const feedRoomIds = feedRooms.map((feedRoom) => feedRoom.slice(5));
  return feedRoomIds.map((id) => usersById.get(id));
}

function getUserRoomList(socket) {
  const socketRooms = Array.from(socket.rooms);
  return socketRooms.filter(
    (room) => !room.startsWith('feed:') && !io.of('/').sockets.has(room)
  );
}

function handleNewConnect(socket) {
  const username = socket.handshake.query?.username || socket.id;
  const roomQuery = socket.handshake.query?.rooms;
  const rooms = roomQuery
    ? roomQuery
        .split(',')
        .map((room) => room.trim())
        .filter((room) => room.length > 0)
    : [];

  let shouldUpdate = false;

  users.set(username, socket.id); // add username to users map
  usersById.set(socket.id, username); // reverse mapping
  socket.data.username = username; // add username to socket.data
  socket.join(`feed:${socket.id}`); // create user's feed room

  for (const room of rooms) {
    if (!io.of('/').adapter.rooms.has(room)) {
      shouldUpdate = true;
    }
    socket.join(room);
  }

  //send initial data to the new user
  socket.emit('init', {
    username: username,
    users: Array.from(users.keys()),
    rooms: getRoomList(),
    myRooms: getUserRoomList(socket)
  });

  socket.broadcast.emit('user-list', Array.from(users.keys())); // broadcast updated user list to everyone else
  if (shouldUpdate) socket.broadcast.emit('room-list', getRoomList()); // broadcast updated room list to everyone else if needed
}

function setUsername(socket, username) {
  if (users.has(username) && users.get(username) !== socket.id) {
    // make sure they are not taking someone else's username
    // add an error message here later
    return;
  }
  if (username === socket.data.username) {
    // exit if it's the same as their existing username
    return;
  }
  users.delete(socket.data.username); // delete old username if it exists
  users.set(username, socket.id); // add username to users map
  usersById.set(socket.id, username); // reverse mapping
  socket.data.username = username; // add username to socket.data
  io.emit('user-list', Array.from(users.keys())); // broadcast updated user list to everyone
  socket.emit('confirm-username', username);
}

function handleMsg(socket, msg) {
  const { address } = msg;
  const parts = address.split('/');
  const [, type, target] = parts;
  const username = socket.data.username;
  const remainder =
    type === 'broadcast' || type === 'feed'
      ? parts.slice(2).join('/')
      : parts.slice(3).join('/');
  const suffix = remainder ? `/${remainder}` : '';
  switch (type) {
    case 'broadcast':
      msg.address = `/user/${username}${suffix}`;
      socket.broadcast.emit('msg', msg); // broadcast to everyone else
      break;
    case 'feed':
      msg.address = `/user/${username}${suffix}`;
      socket.to(`feed:${socket.id}`).emit('msg', msg); // broadcast to feed
      break;
    case 'room':
      msg.address = `/room/${target}${suffix}`;
      socket.to(target).emit('msg', msg); // broadcast to room
      break;
    case 'user':
      msg.address = `/user/${username}${suffix}`;
      socket.to(users.get(target)).emit('msg', msg); // send directly to user
      break;
  }
}

function toggleFeed(socket, username) {
  const feed = `feed:${users.get(username)}`;
  if (socket.rooms.has(feed)) {
    socket.leave(feed);
  } else if (users.has(username) && io.of('/').adapter.rooms.has(feed)) {
    socket.join(feed); // only join feed if user and their feed room both exist
  } else {
    console.log('need to make an error here'); // this check could probably happen on the client
  }
  socket.emit('my-feeds', getUserFeedList(socket)); // update user with their feeds
}

function toggleRoom(socket, room) {
  let shouldUpdate = false;
  if (socket.rooms.has(room)) {
    socket.leave(room);
    const roomExists = io.of('/').adapter.rooms.has(room);
    if (!roomExists) shouldUpdate = true;
  } else {
    const roomExisted = io.of('/').adapter.rooms.has(room);
    socket.join(room);
    if (!roomExisted) shouldUpdate = true;
  }
  socket.emit('my-rooms', getUserRoomList(socket)); // update user with their rooms
  if (shouldUpdate) io.emit('room-list', getRoomList()); // broadcast updated room list if needed
}

function createRoom(socket, room) {
  if (!io.of('/').sockets.has(room)) {
    socket.join(room);
    socket.emit('my-rooms', getUserRoomList(socket)); // update user with their rooms
    io.emit('room-list', getRoomList()); // broadcast updated room list
  } else console.log('room already exists'); // this check could probably happen on the client
}

function deleteRoom(room) {
  io.socketsLeave(room);
  io.emit('room-list', getRoomList()); // broadcast updated room list
}

function handleDisconnecting(socket) {
  const rooms = getUserRoomList(socket);
  for (const room of rooms) {
    const roomSize = io.of('/').adapter.rooms.get(room)?.size || 0;
    if (roomSize == 1) {
      socket.data.lastInRoom = true; // set flag if user was last to leave any manually created room
      break;
    }
  }
}

function handleDisconnect(socket) {
  const username = socket.data.username;

  users.delete(username); // delete username from users map
  usersById.delete(socket.id); // delete from reverse map
  io.socketsLeave(`feed:${socket.id}`); // clear out user's feed room
  io.emit('user-list', Array.from(users.keys())); // broadcast updated user list
  if (socket.data.lastInRoom) {
    io.emit('room-list', getRoomList()); // broadcast updated room list if needed
  }
}
