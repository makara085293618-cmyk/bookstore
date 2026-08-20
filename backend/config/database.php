<?php
function getDbConnection(): PDO {
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
