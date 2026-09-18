-- =========================================
-- USERS
-- =========================================

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    login TEXT NOT NULL UNIQUE,

    password TEXT NOT NULL,

    role TEXT NOT NULL DEFAULT 'User'
        CHECK (role IN ('Admin', 'User')),

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- PRINTERS
-- =========================================

CREATE TABLE IF NOT EXISTS printers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    name TEXT NOT NULL UNIQUE,

    description TEXT,

    active INTEGER NOT NULL DEFAULT 1,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);


-- =========================================
-- BOOKINGS
-- =========================================

CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    printer_id INTEGER NOT NULL,

    user_id INTEGER NOT NULL,

    start_time TEXT NOT NULL,

    end_time TEXT NOT NULL,

    comment TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (printer_id)
        REFERENCES printers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);


-- =========================================
-- DEFAULT USERS
-- =========================================

INSERT OR IGNORE INTO users
    (login, password, role)
VALUES
    ('admin', '1234', 'Admin');


INSERT OR IGNORE INTO users
    (login, password, role)
VALUES
    ('user', '1234', 'User');


INSERT OR IGNORE INTO users
    (login, password, role)
VALUES
    ('user2', '1234', 'User');


-- =========================================
-- DEFAULT PRINTERS
-- =========================================

INSERT OR IGNORE INTO printers
    (name, description)
VALUES
    ('Bambu Lab A1 mini', 'FDM 3D-принтер');


INSERT OR IGNORE INTO printers
    (name, description)
VALUES
    ('Bambu Lab P1S', 'FDM 3D-принтер');


INSERT OR IGNORE INTO printers
    (name, description)
VALUES
    ('Prusa MK4', 'FDM 3D-принтер');