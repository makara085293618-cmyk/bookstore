<?php
// កូដសម្រាប់តភ្ជាប់ Neon (PostgreSQL)
$database_url = "postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=verify-full";

// បំបែក URL យកតម្លៃមកប្រើ
$dbopts = parse_url($database_url);
$dsn = "pgsql:host=" . $dbopts["host"] . ";port=" . ($dbopts["port"] ?? 5432) . ";dbname=" . ltrim($dbopts["path"], '/') . ";sslmode=verify-full";

try {
    $pdo = new PDO($dsn, $dbopts["user"], $dbopts["pass"]);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die(json_encode(["error" => "Connection failed: " . $e->getMessage()]));
}
?>