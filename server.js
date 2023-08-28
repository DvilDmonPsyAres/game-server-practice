const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    console.log(reqBody);
    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if(req.method === 'GET' && req.url === '/'){
      const htmlPage = fs.readFileSync('./views/new-player.html', 'utf-8');
      const resBody = htmlPage.replace(/#{availableRooms}/g, `${world.availableRoomsToString()}`);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      res.end(resBody);
      return;
    }
    // Phase 2: POST /player
    if(req.method === 'POST' && req.url === '/player') {
      let {name, roomId} = req.body;
      const room = world.rooms[roomId];
      player = new Player(name, room);
      res.statusCode = 302;
      res.setHeader('Location', `/rooms/${roomId}`);
      return res.end();

    }

    if(req.method === 'GET' && player === undefined) {
      res.statusCode = 302;
      res.setHeader('Location', '/');
      console.log('Create player first');
      return res.end();
    }

    // Phase 3: GET /rooms/:roomId
    if(req.method === 'GET' && req.url.startsWith('/rooms/') && req.url.split('/').length === 3) {
      try {
        let roomId = req.url.split('/')[2];

        if(Number(roomId) !== player.currentRoom.id) {
          try {
            console.log('Rooms are not according your character');
            res.statusCode = 302;
            res.setHeader('Location', `rooms/${player.currentRoom.id}`);
            res.end();
            return res.end();
          } catch {
            console.error('Room Out of Range')
          }
        }

        const room = world.rooms[roomId];
        let htmlPage = fs.readFileSync('./views/room.html', 'utf-8');
        let resBody = htmlPage.replace(/#{roomItems}/g, `${room.itemsToString()}`).replace(/#{roomName}/g, `${room.name}`).replace(/#{exits}/g, `${room.exitsToString()}`).replace(/#{inventory}/g, `${player.inventoryToString()}`)
        // .replace(/{#}/g, `${}`)
        // .replace(/{#}/g, `${}`)

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(resBody);
        return;
      } catch {
        console.log('Something wrong traveling to that room');
        res.statusCode = 302;
        res.setHeader('Location', `rooms/${player.currentRoom.id}`);
        return res.end();
      }
    }

    // Phase 4: GET /rooms/:roomId/:direction
    if(req.method === 'GET' && req.url.startsWith('/rooms/') && req.url.split('/').length === 4) {

      try {
        let roomId = req.url.split('/')[2];
        let moveDirection = req.url.split('/')[3][0]

        if(Number(roomId) !== player.currentRoom.id) {
          console.error('This arent rooms for your player');
          res.statusCode = 302;
          res.setHeader('Location', `rooms/${player.currentRoom.id}`);
          return res.end();
        }

        let room = world.rooms[roomId];

        try {
          player.move(moveDirection)
          res.statusCode = 302;
          res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
          return res.end();
        } catch {
          console.error('Current room is not available for you')
        }
      } catch {
        console.error('Navigate to homepage and create a Player first')
      }



    }
    // Phase 5: POST /items/:itemId/:action
    if(req.method === 'POST' && req.url.startsWith('/items/')) {
      const itemId = req.url.split('/')[2];
      const itemAction = req.url.split('/')[3];
      const currentRoomId = player.currentRoom.id;
      const room = world.rooms[currentRoomId];

      console.log('testing switcher')
      switch (itemAction) {
        case 'drop':
          //testing all functionality of the methods inside the server
          // console.log('droping test');
          // console.log(player.items);
          // player.dropItem(itemId);
          // console.log(player.items);
          try {
            player.dropItem(itemId);
            res.statusCode = 302;
            res.setHeader('Location', `/rooms/${currentRoomId}`);
            return res.end();
          } catch {
            console.error('Already you do not have this item.')
          }
          break;

        case 'take':
        //Adding extra security methods for item handling.
          let roomItems = new Set()
          for(item of room.items) {
            roomItems.add(item.id)
          }
          if(!roomItems.has(Number(itemId))) {
            console.log('this item does not exists on current room')
          }
          try {
            player.takeItem(itemId);
            res.statusCode = 302;
            res.setHeader('Location', `/rooms/${currentRoomId}`);
            return res.end();
          } catch {
            console.error('Current room is not for you available');
          }
          break;

        case 'eat':
          console.log('eating test');
          try {
            player.eatItem(itemId);
            res.statusCode = 302;
            res.setHeader('Location', `/rooms/${currentRoomId}`);
            return res.end();
          } catch {
            console.error("This items isn't for you available");
          }
          break;

        default:
          console.log('Item method not available')
      }
    }
    // Phase 6: Redirect if no matching route handlers
    if(req.method === 'GET') {
        console.log('This action is not accessible for you.')
        res.statusCode = 302;
        res.setHeader('Location', `/rooms/${player.currentRoom.id}`);
        return res.end();
    }

  });
});

const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
