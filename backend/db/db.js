// В db.js
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'db',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'my_database',
});

// Добавьте проверку подключения
(async () => {
    try {
        await pool.connect();
        console.log('Успешно подключились к базе данных');
    } catch (err) {
        console.error('Ошибка подключения к базе данных:', err);
        process.exit(1);
    }
})();
