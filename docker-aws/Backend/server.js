import express from "express" //Express helps you create a web server easily.
import { createServer } from "http"//This imports Node's HTTP server.
import { Server } from "socket.io"//This imports Socket.IO.Socket.IO is responsible for real-time communication.
import { YSocketIO } from "y-socket.io/dist/server"


const app = express()
app.use(express.static("public")) //"If someone asks for a file, look inside the public folder."


const httpServer = createServer(app) // Create an HTTP server using the Express app.
// now it can use the express application.

const io = new Server(httpServer, { // Create a Socket.IO server using the HTTP server
    cors: {
        origin: "*",// Allow requests from any origin
        methods: [ "GET", "POST" ]// Allow GET and POST methods
    }
})


const ySocketIO = new YSocketIO(io)// Create a YSocketIO instance using the Socket.IO server(connect this two together)
ySocketIO.initialize()// Initialize the YSocketIO instance


app.get('/health', (req, res) => {// Define a health check endpoint
    res.status(200).json({// Send a JSON response with status 200
        message: "ok",// Message indicating the server is healthy
        success: true// Success flag indicating the request was successful
    })
})//This is unrelated to the editor itself.It's simply a way to check:"Is my server running?"


httpServer.listen(3000, () => {// Start the HTTP server on port 3000
    console.log("Server is running on port 3000")// Log a message indicating the server is running
})