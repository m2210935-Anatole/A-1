let socket = null;

let currentUser = null;

let printers = [];

let bookings = [];

let users = [];


// =====================================================
// ELEMENTS
// =====================================================

const loginScreen =
    document.getElementById(
        "loginScreen"
    );

const application =
    document.getElementById(
        "application"
    );

const loginInput =
    document.getElementById(
        "login"
    );

const passwordInput =
    document.getElementById(
        "password"
    );

const loginButton =
    document.getElementById(
        "loginButton"
    );

const loginMessage =
    document.getElementById(
        "loginMessage"
    );

const currentUserElement =
    document.getElementById(
        "currentUser"
    );

const currentRoleElement =
    document.getElementById(
        "currentRole"
    );

const adminPanel =
    document.getElementById(
        "adminPanel"
    );

const bookingPrinter =
    document.getElementById(
        "bookingPrinter"
    );

const bookingStart =
    document.getElementById(
        "bookingStart"
    );

const bookingEnd =
    document.getElementById(
        "bookingEnd"
    );

const bookingComment =
    document.getElementById(
        "bookingComment"
    );

const bookingButton =
    document.getElementById(
        "bookingButton"
    );

const bookingMessage =
    document.getElementById(
        "bookingMessage"
    );

const printersList =
    document.getElementById(
        "printersList"
    );

const bookingsTable =
    document.getElementById(
        "bookingsTable"
    );

const usersTable =
    document.getElementById(
        "usersTable"
    );


// =====================================================
// CONNECT WEBSOCKET
// =====================================================

function connect() {

    const protocol =
        window.location.protocol ===
        "https:"
            ? "wss:"
            : "ws:";


    socket =
        new WebSocket(
            `${protocol}//${window.location.host}`
        );


    socket.onopen = () => {

        console.log(
            "WebSocket connected"
        );


        loginButton.disabled =
            false;


        loginMessage.textContent =
            "Соединение с сервером установлено";


        loginMessage.className =
            "message success";
    };


    socket.onmessage =
        event => {

            try {

                const data =
                    JSON.parse(
                        event.data
                    );


                console.log(
                    "Server:",
                    data
                );


                handleMessage(
                    data
                );

            }

            catch (error) {

                console.error(
                    "JSON error:",
                    error
                );
            }
        };


    socket.onerror = error => {

        console.error(
            "WebSocket error:",
            error
        );


        loginMessage.textContent =
            "Ошибка соединения с сервером";


        loginMessage.className =
            "message error";
    };


    socket.onclose = () => {

        console.log(
            "WebSocket disconnected"
        );


        loginButton.disabled =
            true;
    };
}


// =====================================================
// SEND
// =====================================================

function send(
    data
) {

    if (
        !socket ||
        socket.readyState !==
        WebSocket.OPEN
    ) {

        alert(
            "Нет соединения с сервером"
        );

        return;
    }


    socket.send(
        JSON.stringify(data)
    );
}


// =====================================================
// SERVER MESSAGES
// =====================================================

function handleMessage(
    data
) {


    // =================================================
    // LOGIN RESULT
    // =================================================

    if (
        data.type ===
        "loginResult"
    ) {

        if (
            !data.success
        ) {

            loginMessage.textContent =
                data.message;


            loginMessage.className =
                "message error";


            return;
        }


        currentUser =
            data.user;


        loginScreen.style.display =
            "none";


        application.style.display =
            "block";


        currentUserElement.textContent =
            currentUser.login;


        currentRoleElement.textContent =
            currentUser.role;


        if (
            currentUser.role ===
            "Admin"
        ) {

            adminPanel.style.display =
                "block";

        }

        else {

            adminPanel.style.display =
                "none";
        }


        return;
    }


    // =================================================
    // INITIAL DATA
    // =================================================

    if (
        data.type ===
        "initialData"
    ) {

        printers =
            data.printers || [];


        bookings =
            data.bookings || [];


        currentUser =
            data.currentUser;


        renderAll();


        return;
    }


    // =================================================
    // USERS
    // =================================================

    if (
        data.type ===
        "users"
    ) {

        users =
            data.users || [];


        renderUsers();


        return;
    }


    // =================================================
    // SUCCESS
    // =================================================

    if (
        data.type ===
        "success"
    ) {

        showSuccess(
            data.message
        );


        return;
    }


    // =================================================
    // ERROR
    // =================================================

    if (
        data.type ===
        "error"
    ) {

        alert(
            data.message
        );


        return;
    }
}


// =====================================================
// RENDER ALL
// =====================================================

function renderAll() {

    renderPrinters();

    renderBookingPrinter();

    renderBookings();

    renderUsers();
}


// =====================================================
// RENDER PRINTERS
// =====================================================

function renderPrinters() {

    printersList.innerHTML =
        "";


    printers.forEach(
        printer => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "printer";


            let action = "";


            if (
                currentUser &&
                currentUser.role ===
                    "Admin"
            ) {

                action = `

                    <button
                        class="danger"
                        onclick="deletePrinter(${printer.id})"
                    >
                        Удалить
                    </button>

                `;
            }


            div.innerHTML = `

                <div
                    class="printer-info"
                >

                    <strong>
                        ${escapeHtml(
                            printer.name
                        )}
                    </strong>

                    <small>
                        ${escapeHtml(
                            printer.description ||
                            ""
                        )}
                    </small>

                </div>

                ${action}

            `;


            printersList.appendChild(
                div
            );
        }
    );
}


// =====================================================
// RENDER PRINTER SELECT
// =====================================================

function renderBookingPrinter() {

    bookingPrinter.innerHTML =
        "";


    if (
        printers.length === 0
    ) {

        const option =
            document.createElement(
                "option"
            );


        option.textContent =
            "Нет доступных принтеров";


        option.value =
            "";


        bookingPrinter.appendChild(
            option
        );


        return;
    }


    printers.forEach(
        printer => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                printer.id;


            option.textContent =
                printer.name;


            bookingPrinter.appendChild(
                option
            );
        }
    );
}


// =====================================================
// RENDER BOOKINGS
// =====================================================

function renderBookings() {

    bookingsTable.innerHTML =
        "";


    if (
        bookings.length === 0
    ) {

        bookingsTable.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="text-align:center;"
                >
                    Бронирований пока нет
                </td>

            </tr>

        `;


        return;
    }


    bookings.forEach(
        booking => {

            const tr =
                document.createElement(
                    "tr"
                );


            const isOwner =
                currentUser &&
                booking.user_id ===
                    currentUser.id;


            const isAdmin =
                currentUser &&
                currentUser.role ===
                    "Admin";


            if (isOwner) {

                tr.className =
                    "my-booking";
            }


            let actions =
                "";


            // Admin может изменить
            // любую бронь

            if (isAdmin) {

                actions += `

                    <button
                        onclick="editBooking(${booking.id})"
                    >
                        Изменить
                    </button>

                `;
            }


            // Admin может удалить любую
            // User только свою

            if (
                isAdmin ||
                isOwner
            ) {

                actions += `

                    <button
                        class="danger"
                        onclick="deleteBooking(${booking.id})"
                    >
                        Отменить
                    </button>

                `;
            }


            tr.innerHTML = `

                <td>
                    ${escapeHtml(
                        booking.printer_name
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        booking.user_login
                    )}
                    ${
                        isOwner
                            ? " (Вы)"
                            : ""
                    }
                </td>

                <td>
                    ${formatDate(
                        booking.start_time
                    )}
                </td>

                <td>
                    ${formatDate(
                        booking.end_time
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        booking.comment ||
                        ""
                    )}
                </td>

                <td>

                    <div class="actions">

                        ${actions}

                    </div>

                </td>

            `;


            bookingsTable.appendChild(
                tr
            );
        }
    );
}


// =====================================================
// RENDER USERS
// =====================================================

function renderUsers() {

    if (
        !currentUser ||
        currentUser.role !==
            "Admin"
    ) {

        return;
    }


    usersTable.innerHTML =
        "";


    users.forEach(
        user => {

            const tr =
                document.createElement(
                    "tr"
                );


            let action =
                "";


            if (
                user.id !==
                currentUser.id
            ) {

                action = `

                    <button
                        class="danger"
                        onclick="deleteUser(${user.id})"
                    >
                        Удалить
                    </button>

                `;
            }


            tr.innerHTML = `

                <td>
                    ${user.id}
                </td>

                <td>
                    ${escapeHtml(
                        user.login
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        user.role
                    )}
                </td>

                <td>
                    ${formatDate(
                        user.created_at
                    )}
                </td>

                <td>
                    ${action}
                </td>

            `;


            usersTable.appendChild(
                tr
            );
        }
    );
}


// =====================================================
// CREATE BOOKING
// =====================================================

bookingButton.addEventListener(
    "click",
    () => {

        const printerId =
            Number(
                bookingPrinter.value
            );


        const startTime =
            bookingStart.value;


        const endTime =
            bookingEnd.value;


        const comment =
            bookingComment.value.trim();


        if (
            !printerId ||
            !startTime ||
            !endTime
        ) {

            bookingMessage.textContent =
                "Заполните все поля";


            bookingMessage.className =
                "message error";


            return;
        }


        if (
            startTime >=
            endTime
        ) {

            bookingMessage.textContent =
                "Конец должен быть позже начала";


            bookingMessage.className =
                "message error";


            return;
        }


        send({

            type:
                "createBooking",

            printerId,

            startTime,

            endTime,

            comment

        });


        bookingMessage.textContent =
            "Создание бронирования...";


        bookingMessage.className =
            "message";
    }
);


// =====================================================
// ADD USER
// =====================================================

document
    .getElementById(
        "createUserButton"
    )
    .addEventListener(
        "click",
        () => {

            const login =
                document
                    .getElementById(
                        "newUserLogin"
                    )
                    .value
                    .trim();


            const password =
                document
                    .getElementById(
                        "newUserPassword"
                    )
                    .value;


            const role =
                document
                    .getElementById(
                        "newUserRole"
                    )
                    .value;


            const message =
                document
                    .getElementById(
                        "createUserMessage"
                    );


            if (
                !login ||
                !password
            ) {

                message.textContent =
                    "Введите логин и пароль";


                message.className =
                    "message error";


                return;
            }


            send({

                type:
                    "createUser",

                login,

                password,

                role

            });


            document
                .getElementById(
                    "newUserLogin"
                )
                .value = "";


            document
                .getElementById(
                    "newUserPassword"
                )
                .value = "";
        }
    );


// =====================================================
// DELETE USER
// =====================================================

function deleteUser(
    userId
) {

    if (
        !confirm(
            "Удалить пользователя?"
        )
    ) {

        return;
    }


    send({

        type:
            "deleteUser",

        userId

    });
}


// =====================================================
// ADD PRINTER
// =====================================================

document
    .getElementById(
        "addPrinterButton"
    )
    .addEventListener(
        "click",
        () => {

            const name =
                document
                    .getElementById(
                        "newPrinterName"
                    )
                    .value
                    .trim();


            const description =
                document
                    .getElementById(
                        "newPrinterDescription"
                    )
                    .value
                    .trim();


            const message =
                document
                    .getElementById(
                        "adminPrinterMessage"
                    );


            if (!name) {

                message.textContent =
                    "Введите название принтера";


                message.className =
                    "message error";


                return;
            }


            send({

                type:
                    "addPrinter",

                name,

                description

            });


            document
                .getElementById(
                    "newPrinterName"
                )
                .value = "";


            document
                .getElementById(
                    "newPrinterDescription"
                )
                .value = "";
        }
    );


// =====================================================
// DELETE PRINTER
// =====================================================

function deletePrinter(
    printerId
) {

    if (
        !confirm(
            "Удалить принтер?\n\nВсе его бронирования также будут удалены."
        )
    ) {

        return;
    }


    send({

        type:
            "deletePrinter",

        printerId

    });
}


// =====================================================
// DELETE BOOKING
// =====================================================

function deleteBooking(
    bookingId
) {

    if (
        !confirm(
            "Отменить бронирование?"
        )
    ) {

        return;
    }


    send({

        type:
            "deleteBooking",

        bookingId

    });
}


// =====================================================
// EDIT BOOKING
// =====================================================

function editBooking(
    bookingId
) {

    const booking =
        bookings.find(
            item =>
                item.id ===
                bookingId
        );


    if (!booking) {

        return;
    }


    const printerId =
        prompt(
            "ID принтера:\n\n" +
            printers
                .map(
                    p =>
                        `${p.id} — ${p.name}`
                )
                .join("\n"),

            booking.printer_id
        );


    if (
        printerId ===
        null
    ) {

        return;
    }


    const userId =
        prompt(
            "ID пользователя:\n\n" +
            users
                .map(
                    u =>
                        `${u.id} — ${u.login} (${u.role})`
                )
                .join("\n"),

            booking.user_id
        );


    if (
        userId ===
        null
    ) {

        return;
    }


    const startTime =
        prompt(
            "Начало:",
            booking.start_time
        );


    if (
        startTime ===
        null
    ) {

        return;
    }


    const endTime =
        prompt(
            "Конец:",
            booking.end_time
        );


    if (
        endTime ===
        null
    ) {

        return;
    }


    const comment =
        prompt(
            "Комментарий:",
            booking.comment ||
                ""
        );


    if (
        comment ===
        null
    ) {

        return;
    }


    send({

        type:
            "updateBooking",

        bookingId,

        printerId:
            Number(
                printerId
            ),

        userId:
            Number(
                userId
            ),

        startTime,

        endTime,

        comment

    });
}


// =====================================================
// LOGOUT
// =====================================================

document
    .getElementById(
        "logoutButton"
    )
    .addEventListener(
        "click",
        () => {

            location.reload();

        }
    );


// =====================================================
// LOGIN
// =====================================================

loginButton.addEventListener(
    "click",
    () => {

        const login =
            loginInput.value.trim();


        const password =
            passwordInput.value;


        if (
            !login ||
            !password
        ) {

            loginMessage.textContent =
                "Введите логин и пароль";


            loginMessage.className =
                "message error";


            return;
        }


        send({

            type:
                "login",

            login,

            password

        });


        loginMessage.textContent =
            "Проверка...";


        loginMessage.className =
            "message";
    }
);


// =====================================================
// ENTER
// =====================================================

passwordInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            loginButton.click();
        }
    }
);


// =====================================================
// SUCCESS MESSAGE
// =====================================================

function showSuccess(
    text
) {

    console.log(
        "Success:",
        text
    );
}


// =====================================================
// DATE
// =====================================================

function formatDate(
    value
) {

    if (!value) {

        return "";
    }


    return String(
        value
    ).replace(
        "T",
        " "
    );
}


// =====================================================
// HTML ESCAPE
// =====================================================

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// =====================================================
// START
// =====================================================

connect();