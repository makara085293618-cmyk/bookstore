<?php
/**
 * Shared helpers used by every API endpoint.
 * មុខងារជំនួយទូទៅ ប្រើក្នុងគ្រប់ API endpoint
 */

// --- CORS: allow the Vercel-hosted frontend to call this API ---
function applyCors(): void {
    $allowedOrigin = getenv('FRONTEND_URL') ?: '*'; // set FRONTEND_URL in Render env vars once you know your Vercel URL
    header("Access-Control-Allow-Origin: $allowedOrigin");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=utf-8');

    // Browsers send an OPTIONS "preflight" request before real requests. Just say OK.
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

// --- Send JSON and stop ---
function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// --- Read JSON body sent by fetch() from the frontend ---
function getJsonBody(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

// --- Create a random auth token and store it (valid 7 days) ---
function createAuthToken(PDO $pdo, int $userId): string {
    $token = bin2hex(random_bytes(32));
    $expiresAt = (new DateTime('+7 days'))->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare(
        'INSERT INTO auth_tokens (user_id, token, expires_at) VALUES (:user_id, :token, :expires_at)'
    );
    $stmt->execute(['user_id' => $userId, 'token' => $token, 'expires_at' => $expiresAt]);

    return $token;
}

// --- Look at the Authorization header, validate the token, return the user (or null) ---
function getAuthenticatedUser(PDO $pdo): ?array {
    $headers = getallheaders();
    $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!str_starts_with($authHeader, 'Bearer ')) {
        return null;
    }
    $token = substr($authHeader, 7);

    $stmt = $pdo->prepare(
        'SELECT u.id, u.name, u.email, u.role
         FROM auth_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token = :token AND t.expires_at > NOW()'
    );
    $stmt->execute(['token' => $token]);
    $user = $stmt->fetch();

    return $user ?: null;
}

// --- Require login, or stop the request with 401 ---
function requireAuth(PDO $pdo): array {
    $user = getAuthenticatedUser($pdo);
    if (!$user) {
        jsonResponse(['error' => 'Unauthorized. Please log in.'], 401);
    }
    return $user;
}

// --- Require admin role, or stop the request with 403 ---
function requireAdmin(PDO $pdo): array {
    $user = requireAuth($pdo);
    if ($user['role'] !== 'admin') {
        jsonResponse(['error' => 'Admins only.'], 403);
    }
    return $user;
}
