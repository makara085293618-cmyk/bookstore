<?php
/**
 * Database connection (PostgreSQL via PDO)
 * ការភ្ជាប់ទិន្នន័យ - យើងប្រើ PDO ព្រោះវាមានសុវត្ថិភាព (prepared statements)
 *
 * We read credentials from environment variables so the SAME code works:
 *  - on your local machine (.env loaded manually or via a tool like phpdotenv)
 *  - on Render / Railway (set these in their dashboard "Environment" tab)
 *
 * Required env vars:
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
 */

function getDbConnection(): PDO {
    // Support either individual vars OR a single DATABASE_URL (common on Render/Railway)
    $databaseUrl = getenv('DATABASE_URL');

    if ($databaseUrl) {
        $parts = parse_url($databaseUrl);
        $host = $parts['host'];
        $port = $parts['port'] ?? 5432;
        $dbname = ltrim($parts['path'], '/');
        $user = $parts['user'];
        $password = $parts['pass'];
    } else {
        $host = getenv('DB_HOST') ?: '127.0.0.1';
        $port = getenv('DB_PORT') ?: 5432;
        $dbname = getenv('DB_NAME') ?: 'bookstore';
        $user = getenv('DB_USER') ?: 'postgres';
        $password = getenv('DB_PASSWORD') ?: '';
    }

    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=require";

    try {
        $pdo = new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database connection failed', 'details' => $e->getMessage()]);
        exit;
    }
}
