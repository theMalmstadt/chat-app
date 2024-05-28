// Server
const app = require('./app')
const http = require('http')
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages')
const {getUser, getUsersInRoom, removeUser, addUser} = require('./utils/users')

const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000

io.on('connection', (socket) => {
	console.log('New WebSocket connection!')
	
	socket.on('join', (options, callback) => {
		const {error, user} = addUser({id: socket.id, ...options})

		if (error) {
			return callback(error)
		}

		socket.join(user.room)

		// emit a message to only the user that has joined
		// emit a message to everyone in the room including the user that joined
		socket.emit('message', generateMessage('Admin', `Welcome ${user.username}!`))
		// emit a message to everyone except the user that joined the room
		socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))

		io.to(user.room).emit('roomData', {
			room: user.room,
			users: getUsersInRoom(user.room)
		})

		callback()

		// socket.emit, io.emit, socket.broadcast.emit
		// io.to.emit, socket.broadcast.to.emit
	})

	
	socket.on('sendMessage', (message, callback) => {
		const filter = new Filter()

		if (filter.isProfane(message)) {
			return callback('Profanity is not allowed')
		}

		const user = getUser(socket.id)

		io.to(user.room).emit('message', generateMessage(user.username, message))
		callback()
	})

	socket.on('sendLocation', (data, callback) => {
		const url = `https://google.com/maps?q=${data.latitude},${data.longitude}`
		const user = getUser(socket.id)

		io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, url))
		callback()
	})

	socket.on('disconnect', () => {
		const user = removeUser(socket.id)

		if (user) {
			io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
			io.to(user.room).emit('roomData', {
				room: user.room,
				users: getUsersInRoom(user.room)
			})
		}
	})
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})
