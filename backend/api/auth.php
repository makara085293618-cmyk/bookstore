<?php
/**
 * =========================================================
 *  auth.php — API សម្រាប់ចុះឈ្មោះ និងចូលប្រើប្រាស់
 * =========================================================
 *   POST /api/auth.php?action=register  -> ចុះឈ្មោះថ្មី
 *   POST /api/auth.php?action=login     -> ចូលប្រើប្រាស់
 *   POST /api/auth.php?action=logout    -> ចាកចេញ
 *   GET  /api/auth.php?action=me        -> ព័ត៌មានអ្នកប្រើប្រាស់បច្ចុប្បន្ន
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();

$action = $_GET['action'] ?? '';

switch ($action) {

    // ---------------------------------------------------
    // ចុះឈ្មោះថ្មី
    // ---------------------------------------------------
    case 'register':
        $data = getJsonBody();

        foreach (['name', 'email', 'password'] as $field) {
            if (empty($data[$field])) {
                jsonResponse(['error' => "សូមបំពេញ field: $field"], 400);
            }
        }

        // តើ email នេះមានគេប្រើរួចហើយឬនៅ?
        $check = $pdo->prepare('SELECT id FROM users WHERE email = :email');
        $check->execute(['email' => $data['email']]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'អ៊ីមែលនេះមានគេប្រើរួចហើយ'], 409);
        }

        // password_hash() -> កុំដែលរក្សាទុក password ជាអក្សរធម្មតា!
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
            'role' => 'customer', // អ្នកប្រើប្រាស់ថ្មីៗ តែងតែជា customer, admin បង្កើតដោយដៃប៉ុណ្ណោះ
        ]);
        $user = $stmt->fetch();

        // ចុះឈ្មោះរួច -> ចូលប្រើប្រាស់ភ្លាមតែម្តង (ចេញ token ឲ្យ)
        $token = createAuthToken($pdo, $user['id']);

        jsonResponse(['user' => $user, 'token' => $token], 201);
        break;

    // ---------------------------------------------------
    // ចូលប្រើប្រាស់
    // ---------------------------------------------------
    case 'login':
        $data = getJsonBody();

        if (empty($data['email']) || empty($data['password'])) {
            jsonResponse(['error' => 'សូមបំពេញអ៊ីមែល និងលេខសម្ងាត់'], 400);
        }

        $stmt = $pdo->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->execute(['email' => $data['email']]);
        $user = $stmt->fetch();

        // password_verify() ប្រៀបធៀប password ដែលវាយចូល ជាមួយ hash ក្នុង database
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

    // ---------------------------------------------------
    // ចាកចេញ -> លុប token ចោល
    // ---------------------------------------------------
    case 'logout':
        $user = requireAuth($pdo);
        $headers = getallheaders();
        $token = substr($headers['Authorization'] ?? '', 7);

        $stmt = $pdo->prepare('DELETE FROM auth_tokens WHERE token = :token');
        $stmt->execute(['token' => $token]);

        jsonResponse(['message' => 'បានចាកចេញដោយជោគជ័យ']);
        break;

    // ---------------------------------------------------
    // ព័ត៌មានអ្នកប្រើប្រាស់បច្ចុប្បន្ន (ដើម្បីឲ្យ React ដឹងថានរណា login នៅ)
    // ---------------------------------------------------
    case 'me':
        $user = requireAuth($pdo);
        jsonResponse(['user' => $user]);
        break;

    default:
        jsonResponse(['error' => 'សូមផ្តល់ ?action=register|login|logout|me'], 400);
}
