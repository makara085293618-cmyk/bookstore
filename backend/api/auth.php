<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';

switch ($action) {

    case 'register':
        $data = getJsonBody();

        foreach (['name', 'email', 'password'] as $field) {
            if (empty($data[$field])) {
                jsonResponse(['error' => "សូមបំពេញ field: $field"], 400);
            }
        }

        $check = $pdo->prepare('SELECT id FROM users WHERE email = :email');
        $check->execute(['email' => $data['email']]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'អ៊ីមែលនេះមានគេប្រើរួចហើយ'], 409);
        }

        $hashedPassword = password_hash($data['password'], PASSWORD_BCRYPT);

        $stmt = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role)
             VALUES (:name, :email, :password_hash, :role)
             RETURNING id, name, email, role'
        );
        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password_hash' => $hashedPassword,
            'role' => 'customer',
        ]);
        $user = $stmt->fetch();

        $token = createAuthToken($pdo, $user['id']);

        jsonResponse(['user' => $user, 'token' => $token], 201);
        break;

    case 'login':
        $data = getJsonBody();

        if (empty($data['email']) || empty($data['password'])) {
            jsonResponse(['error' => 'សូមបំពេញអ៊ីមែល និងលេខសម្ងាត់'], 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute(['email' => $data['email']]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($data['password'], $user['password_hash'])) {
            jsonResponse(['error' => 'អ៊ីមែល ឬលេខសម្ងាត់មិនត្រឹមត្រូវ'], 401);
        }

        $token = createAuthToken($pdo, $user['id']);

        jsonResponse([
            'user' => [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
            ],
            'token' => $token,
        ]);
        break;

    case 'logout':
        $user = requireAuth($pdo);
        $headers = getallheaders();
        $token = substr($headers['Authorization'] ?? '', 7);

        $stmt = $pdo->prepare('DELETE FROM auth_tokens WHERE token = :token');
        $stmt->execute(['token' => $token]);

        jsonResponse(['message' => 'បានចាកចេញដោយជោគជ័យ']);
        break;

    case 'me':
        $user = requireAuth($pdo);
        jsonResponse(['user' => $user]);
        break;

    default:
        jsonResponse(['error' => 'សូមផ្តល់ ?action=register|login|logout|me'], 400);
}
