require("dotenv").config()
const express = require('express');
const { Server } = require('socket.io');
const CognitoExpress = require("cognito-express");

const app = express()
app.use(express.json());
app.use(
    express.urlencoded({
        extended: false,
    })
);

app.use("/ping", (req, res)=>res.send("pinging"))

const cognito = new CognitoExpress({
    region: process.env.REGION,
    cognitoUserPoolId: process.env.POOLID,
    tokenUse: "id",
    tokenExpiration: 604800
})

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`running on port ${PORT}`));

const socketServer = new Server(server);
const users = {}

socketServer.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token) {
        cognito.validate(token, (err, res) => {
            if (err) return next(err);
            socket.user = res["cognito:username"];
            users[res["cognito:username"]] = socket.id;
            next();
        })
    } else {
        console.log("auth failed");
        next(new Error("auth failed"));
    }
})


socketServer.on('connection', (socket) => {

    socket.on("contact request", (data) => {
        socketServer.to(users[data.receiver]).emit("contact request", data)
    });

    socket.on("request accepted", (data) => {
        socketServer.to(users[data.receiver]).emit("request accepted", data)
    });

    socket.on("request rejected", (data) => {
        socketServer.to(users[data.receiver]).emit("request rejected", data)
    });

    socket.on("request canceled", (data) => {
        socketServer.to(users[data.receiver]).emit("request canceled", data)
    });

    socket.on('event message', (data) => {
        socketServer.to(users[data.receiver]).emit("event message", data)
    });

    socket.on('disconnect', () => {
        delete users[socket.user]
        console.log(users);
    });
});
