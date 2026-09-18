const http = require("http");
const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");
const Database = require("better-sqlite3");

const PORT = 3000;


// =====================================================
// DATABASE
// =====================================================

const db = new Database(
    path.join(__dirname, "database.db")
);

db.pragma("foreign_keys = ON");


// Создание таблиц и начальных данных

const sqlPath =
    path.join(__dirname, "users.sql");

const sql =
    fs.readFileSync(
        sqlPath,
        "utf8"
    );

db.exec(sql);

console.log("Database initialized");


// =====================================================
// HTTP SERVER
// =====================================================

const server =
    http.createServer(
        (req, res) => {

            let filePath;


            if (
                req.url === "/" ||
                req.url === "/client.html"
            ) {

                filePath =
                    path.join(
                        __dirname,
                        "client.html"
                    );
            }

            else if (
                req.url === "/client.js"
            ) {

                filePath =
                    path.join(
                        __dirname,
                        "client.js"
                    );
            }

            else {

                res.writeHead(404);

                res.end(
                    "Not Found"
                );

                return;
            }


            fs.readFile(
                filePath,
                (error, data) => {

                    if (error) {

                        console.error(
                            error
                        );

                        res.writeHead(500);

                        res.end(
                            "Server Error"
                        );

                        return;
                    }


                    let contentType =
                        "text/plain; charset=utf-8";


                    if (
                        filePath.endsWith(
                            ".html"
                        )
                    ) {

                        contentType =
                            "text/html; charset=utf-8";
                    }


                    if (
                        filePath.endsWith(
                            ".js"
                        )
                    ) {

                        contentType =
                            "application/javascript; charset=utf-8";
                    }


                    res.writeHead(
                        200,
                        {
                            "Content-Type":
                                contentType
                        }
                    );


                    res.end(
                        data
                    );
                }
            );
        }
    );


// =====================================================
// WEBSOCKET
// =====================================================

const wss =
    new WebSocket.Server({
        server
    });


// =====================================================
// SEND MESSAGE
// =====================================================

function send(
    socket,
    data
) {

    if (
        socket.readyState ===
        WebSocket.OPEN
    ) {

        socket.send(
            JSON.stringify(data)
        );
    }
}


// =====================================================
// AUTHORIZATION
// =====================================================

function requireAuth(
    socket
) {

    if (!socket.user) {

        send(
            socket,
            {
                type: "error",
                message:
                    "Необходима авторизация"
            }
        );

        return false;
    }

    return true;
}


// =====================================================
// ADMIN AUTHORIZATION
// =====================================================

function requireAdmin(
    socket
) {

    if (
        !requireAuth(socket)
    ) {

        return false;
    }


    if (
        socket.user.role !==
        "Admin"
    ) {

        send(
            socket,
            {
                type: "error",
                message:
                    "Недостаточно прав. Требуется Admin."
            }
        );

        return false;
    }


    return true;
}


// =====================================================
// GET PRINTERS
// =====================================================

function getPrinters() {

    return db.prepare(`
        SELECT
            id,
            name,
            description,
            active
        FROM printers
        WHERE active = 1
        ORDER BY id
    `).all();
}


// =====================================================
// GET BOOKINGS
// =====================================================

function getBookings() {

    return db.prepare(`
        SELECT

            bookings.id,

            bookings.printer_id,

            printers.name
                AS printer_name,

            bookings.user_id,

            users.login
                AS user_login,

            bookings.start_time,

            bookings.end_time,

            bookings.comment

        FROM bookings

        INNER JOIN printers
            ON printers.id =
                bookings.printer_id

        INNER JOIN users
            ON users.id =
                bookings.user_id

        ORDER BY
            bookings.start_time ASC
    `).all();
}


// =====================================================
// GET USERS
// =====================================================

function getUsers() {

    return db.prepare(`
        SELECT

            id,
            login,
            role,
            created_at

        FROM users

        ORDER BY id
    `).all();
}


// =====================================================
// SEND INITIAL DATA
// =====================================================

function sendInitialData(
    socket
) {

    if (!socket.user) {
        return;
    }


    send(
        socket,
        {
            type: "initialData",

            printers:
                getPrinters(),

            bookings:
                getBookings(),

            currentUser:
                socket.user
        }
    );


    // Только Admin получает пользователей

    if (
        socket.user.role ===
        "Admin"
    ) {

        send(
            socket,
            {
                type: "users",

                users:
                    getUsers()
            }
        );
    }
}


// =====================================================
// BROADCAST
// =====================================================

function broadcastData() {

    wss.clients.forEach(
        client => {

            if (
                client.readyState ===
                WebSocket.OPEN
            ) {

                if (
                    client.user
                ) {

                    sendInitialData(
                        client
                    );
                }
            }
        }
    );
}


// =====================================================
// CONNECTION
// =====================================================

wss.on(
    "connection",
    socket => {

        console.log(
            "Client connected"
        );


        socket.on(
            "message",
            rawMessage => {

                try {

                    const data =
                        JSON.parse(
                            rawMessage
                        );


                    console.log(
                        "Request:",
                        data.type
                    );


                    // =================================================
                    // LOGIN
                    // =================================================

                    if (
                        data.type ===
                        "login"
                    ) {

                        const login =
                            String(
                                data.login ||
                                ""
                            ).trim();


                        const password =
                            String(
                                data.password ||
                                ""
                            );


                        const user =
                            db.prepare(`
                                SELECT
                                    id,
                                    login,
                                    password,
                                    role
                                FROM users
                                WHERE login = ?
                            `).get(
                                login
                            );


                        if (
                            !user ||
                            user.password !==
                                password
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "loginResult",

                                    success:
                                        false,

                                    message:
                                        "Неверный логин или пароль"
                                }
                            );

                            return;
                        }


                        // Сохраняем авторизацию
                        // на WebSocket-соединении

                        socket.user = {

                            id:
                                user.id,

                            login:
                                user.login,

                            role:
                                user.role
                        };


                        send(
                            socket,
                            {
                                type:
                                    "loginResult",

                                success:
                                    true,

                                message:
                                    "Авторизация успешна",

                                user:
                                    socket.user
                            }
                        );


                        sendInitialData(
                            socket
                        );


                        return;
                    }


                    // =================================================
                    // ВСЕ ОСТАЛЬНЫЕ КОМАНДЫ ТРЕБУЮТ LOGIN
                    // =================================================

                    if (
                        !requireAuth(
                            socket
                        )
                    ) {

                        return;
                    }


                    // =================================================
                    // ADD USER
                    // ADMIN ONLY
                    // =================================================

                    if (
                        data.type ===
                        "createUser"
                    ) {

                        if (
                            !requireAdmin(
                                socket
                            )
                        ) {

                            return;
                        }


                        const login =
                            String(
                                data.login ||
                                ""
                            ).trim();


                        const password =
                            String(
                                data.password ||
                                ""
                            );


                        const role =
                            String(
                                data.role ||
                                "User"
                            );


                        if (
                            !login ||
                            !password
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Введите логин и пароль"
                                }
                            );

                            return;
                        }


                        if (
                            role !== "Admin" &&
                            role !== "User"
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Недопустимая роль"
                                }
                            );

                            return;
                        }


                        const existing =
                            db.prepare(`
                                SELECT id
                                FROM users
                                WHERE login = ?
                            `).get(
                                login
                            );


                        if (existing) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Такой логин уже существует"
                                }
                            );

                            return;
                        }


                        db.prepare(`
                            INSERT INTO users
                                (
                                    login,
                                    password,
                                    role
                                )
                            VALUES
                                (?, ?, ?)
                        `).run(
                            login,
                            password,
                            role
                        );


                        send(
                            socket,
                            {
                                type:
                                    "success",

                                message:
                                    `Пользователь "${login}" создан`
                            }
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // DELETE USER
                    // ADMIN ONLY
                    // =================================================

                    if (
                        data.type ===
                        "deleteUser"
                    ) {

                        if (
                            !requireAdmin(
                                socket
                            )
                        ) {

                            return;
                        }


                        const userId =
                            Number(
                                data.userId
                            );


                        // Нельзя удалить самого себя

                        if (
                            userId ===
                            socket.user.id
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Нельзя удалить самого себя"
                                }
                            );

                            return;
                        }


                        // Не даём удалить
                        // последнего Admin

                        const targetUser =
                            db.prepare(`
                                SELECT
                                    id,
                                    role
                                FROM users
                                WHERE id = ?
                            `).get(
                                userId
                            );


                        if (!targetUser) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Пользователь не найден"
                                }
                            );

                            return;
                        }


                        if (
                            targetUser.role ===
                            "Admin"
                        ) {

                            const adminCount =
                                db.prepare(`
                                    SELECT
                                        COUNT(*) AS count
                                    FROM users
                                    WHERE role = 'Admin'
                                `).get();


                            if (
                                adminCount.count <=
                                1
                            ) {

                                send(
                                    socket,
                                    {
                                        type:
                                            "error",

                                        message:
                                            "Нельзя удалить последнего администратора"
                                    }
                                );

                                return;
                            }
                        }


                        db.prepare(`
                            DELETE FROM users
                            WHERE id = ?
                        `).run(
                            userId
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // ADD PRINTER
                    // ADMIN ONLY
                    // =================================================

                    if (
                        data.type ===
                        "addPrinter"
                    ) {

                        if (
                            !requireAdmin(
                                socket
                            )
                        ) {

                            return;
                        }


                        const name =
                            String(
                                data.name ||
                                ""
                            ).trim();


                        const description =
                            String(
                                data.description ||
                                ""
                            ).trim();


                        if (!name) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Введите название принтера"
                                }
                            );

                            return;
                        }


                        const existing =
                            db.prepare(`
                                SELECT id
                                FROM printers
                                WHERE name = ?
                            `).get(
                                name
                            );


                        if (existing) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Такой принтер уже существует"
                                }
                            );

                            return;
                        }


                        db.prepare(`
                            INSERT INTO printers
                                (
                                    name,
                                    description
                                )
                            VALUES
                                (?, ?)
                        `).run(
                            name,
                            description
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // DELETE PRINTER
                    // ADMIN ONLY
                    // =================================================

                    if (
                        data.type ===
                        "deletePrinter"
                    ) {

                        if (
                            !requireAdmin(
                                socket
                            )
                        ) {

                            return;
                        }


                        const printerId =
                            Number(
                                data.printerId
                            );


                        const printer =
                            db.prepare(`
                                SELECT id
                                FROM printers
                                WHERE id = ?
                            `).get(
                                printerId
                            );


                        if (!printer) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Принтер не найден"
                                }
                            );

                            return;
                        }


                        db.prepare(`
                            DELETE FROM printers
                            WHERE id = ?
                        `).run(
                            printerId
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // CREATE BOOKING
                    // =================================================

                    if (
                        data.type ===
                        "createBooking"
                    ) {

                        const printerId =
                            Number(
                                data.printerId
                            );


                        const startTime =
                            String(
                                data.startTime ||
                                ""
                            );


                        const endTime =
                            String(
                                data.endTime ||
                                ""
                            );


                        const comment =
                            String(
                                data.comment ||
                                ""
                            ).trim();


                        if (
                            !printerId ||
                            !startTime ||
                            !endTime
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Заполните все данные"
                                }
                            );

                            return;
                        }


                        if (
                            startTime >=
                            endTime
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Время окончания должно быть позже начала"
                                }
                            );

                            return;
                        }


                        // По умолчанию бронь
                        // принадлежит текущему User

                        let userId =
                            socket.user.id;


                        // Admin может выбрать
                        // другого пользователя

                        if (
                            socket.user.role ===
                            "Admin"
                        ) {

                            if (
                                data.userId !==
                                undefined
                            ) {

                                userId =
                                    Number(
                                        data.userId
                                    );
                            }
                        }


                        // Проверяем принтер

                        const printer =
                            db.prepare(`
                                SELECT id
                                FROM printers
                                WHERE id = ?
                                AND active = 1
                            `).get(
                                printerId
                            );


                        if (!printer) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Принтер не найден"
                                }
                            );

                            return;
                        }


                        // Проверяем пользователя

                        const bookingUser =
                            db.prepare(`
                                SELECT id
                                FROM users
                                WHERE id = ?
                            `).get(
                                userId
                            );


                        if (!bookingUser) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Пользователь не найден"
                                }
                            );

                            return;
                        }


                        // Проверка пересечения

                        const conflict =
                            db.prepare(`
                                SELECT id
                                FROM bookings

                                WHERE printer_id = ?

                                AND start_time < ?

                                AND end_time > ?
                            `).get(
                                printerId,
                                endTime,
                                startTime
                            );


                        if (conflict) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Выбранное время уже занято"
                                }
                            );

                            return;
                        }


                        db.prepare(`
                            INSERT INTO bookings
                                (
                                    printer_id,
                                    user_id,
                                    start_time,
                                    end_time,
                                    comment
                                )
                            VALUES
                                (?, ?, ?, ?, ?)
                        `).run(
                            printerId,
                            userId,
                            startTime,
                            endTime,
                            comment
                        );


                        send(
                            socket,
                            {
                                type:
                                    "success",

                                message:
                                    "Бронирование создано"
                            }
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // UPDATE BOOKING
                    // ADMIN ONLY
                    // =================================================

                    if (
                        data.type ===
                        "updateBooking"
                    ) {

                        if (
                            !requireAdmin(
                                socket
                            )
                        ) {

                            return;
                        }


                        const bookingId =
                            Number(
                                data.bookingId
                            );


                        const printerId =
                            Number(
                                data.printerId
                            );


                        const userId =
                            Number(
                                data.userId
                            );


                        const startTime =
                            String(
                                data.startTime ||
                                ""
                            );


                        const endTime =
                            String(
                                data.endTime ||
                                ""
                            );


                        const comment =
                            String(
                                data.comment ||
                                ""
                            ).trim();


                        if (
                            !bookingId ||
                            !printerId ||
                            !userId ||
                            !startTime ||
                            !endTime
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Некорректные данные"
                                }
                            );

                            return;
                        }


                        if (
                            startTime >=
                            endTime
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Конец должен быть позже начала"
                                }
                            );

                            return;
                        }


                        const booking =
                            db.prepare(`
                                SELECT id
                                FROM bookings
                                WHERE id = ?
                            `).get(
                                bookingId
                            );


                        if (!booking) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Бронирование не найдено"
                                }
                            );

                            return;
                        }


                        const conflict =
                            db.prepare(`
                                SELECT id
                                FROM bookings

                                WHERE printer_id = ?

                                AND id != ?

                                AND start_time < ?

                                AND end_time > ?
                            `).get(
                                printerId,
                                bookingId,
                                endTime,
                                startTime
                            );


                        if (conflict) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Новое время пересекается с другой бронью"
                                }
                            );

                            return;
                        }


                        const printer =
                            db.prepare(`
                                SELECT id
                                FROM printers
                                WHERE id = ?
                                AND active = 1
                            `).get(
                                printerId
                            );


                        const user =
                            db.prepare(`
                                SELECT id
                                FROM users
                                WHERE id = ?
                            `).get(
                                userId
                            );


                        if (
                            !printer ||
                            !user
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Принтер или пользователь не найден"
                                }
                            );

                            return;
                        }


                        db.prepare(`
                            UPDATE bookings

                            SET

                                printer_id = ?,

                                user_id = ?,

                                start_time = ?,

                                end_time = ?,

                                comment = ?

                            WHERE id = ?
                        `).run(
                            printerId,
                            userId,
                            startTime,
                            endTime,
                            comment,
                            bookingId
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // DELETE BOOKING
                    // ADMIN OR OWNER
                    // =================================================

                    if (
                        data.type ===
                        "deleteBooking"
                    ) {

                        const bookingId =
                            Number(
                                data.bookingId
                            );


                        const booking =
                            db.prepare(`
                                SELECT

                                    id,

                                    user_id

                                FROM bookings

                                WHERE id = ?
                            `).get(
                                bookingId
                            );


                        if (!booking) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Бронирование не найдено"
                                }
                            );

                            return;
                        }


                        // Admin может удалить любую бронь

                        const isAdmin =
                            socket.user.role ===
                            "Admin";


                        // User может удалить
                        // только собственную

                        const isOwner =
                            booking.user_id ===
                            socket.user.id;


                        if (
                            !isAdmin &&
                            !isOwner
                        ) {

                            send(
                                socket,
                                {
                                    type:
                                        "error",

                                    message:
                                        "Можно отменить только своё бронирование"
                                }
                            );

                            return;
                        }


                        db.prepare(`
                            DELETE FROM bookings
                            WHERE id = ?
                        `).run(
                            bookingId
                        );


                        broadcastData();

                        return;
                    }


                    // =================================================
                    // UNKNOWN COMMAND
                    // =================================================

                    send(
                        socket,
                        {
                            type:
                                "error",

                            message:
                                "Неизвестная команда"
                        }
                    );

                }

                catch (error) {

                    console.error(
                        "SERVER ERROR:",
                        error
                    );


                    send(
                        socket,
                        {
                            type:
                                "error",

                            message:
                                "Ошибка сервера"
                        }
                    );
                }
            }
        );


        socket.on(
            "close",
            () => {

                console.log(
                    "Client disconnected:",
                    socket.user
                        ? socket.user.login
                        : "unknown"
                );
            }
        );
    }
);


// =====================================================
// START SERVER
// =====================================================

server.listen(
    PORT,
    () => {

        console.log("");
        console.log(
            "======================================"
        );

        console.log(
            "3D PRINTER BOOKING SERVER"
        );

        console.log(
            "======================================"
        );

        console.log(
            `HTTP:      http://localhost:${PORT}`
        );

        console.log(
            `WebSocket: ws://localhost:${PORT}`
        );

        console.log(
            "======================================"
        );

        console.log(
            "Default Admin: admin / 1234"
        );

        console.log(
            "Default User:  user / 1234"
        );

        console.log(
            "======================================"
        );
    }
);