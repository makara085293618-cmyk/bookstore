<?php
/**
 * =========================================================
 *  cart.php — API សម្រាប់កន្ត្រកទិញ (តម្រូវឲ្យ login សិន)
 * =========================================================
 *   GET    /api/cart.php              -> មើលកន្ត្រករបស់ខ្ញុំ
 *   POST   /api/cart.php               -> បន្ថែមសៀវភៅចូលកន្ត្រក {book_id, quantity}
 *   PUT    /api/cart.php?id=3          -> ប្តូរចំនួន (quantity) របស់ item ក្នុងកន្ត្រក
 *   DELETE /api/cart.php?id=3          -> យកចេញពីកន្ត្រក
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();
$user = requireAuth($pdo); // កន្ត្រកត្រូវការ login សិន

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ---------------------------------------------------
    // មើលកន្ត្រករបស់ខ្ញុំ (JOIN ជាមួយ books ដើម្បីបានឈ្មោះ/តម្លៃផងដែរ)
    // ---------------------------------------------------
    case 'GET':
        $stmt = $pdo->prepare(
            'SELECT c.id, c.quantity, b.id as book_id, b.title, b.price, b.image_url, b.stock
             FROM cart_items c
             JOIN books b ON b.id = c.book_id
             WHERE c.user_id = :user_id
             ORDER BY c.created_at'
        );
        $stmt->execute(['user_id' => $user['id']]);
        $items = $stmt->fetchAll();

        // គណនាតម្លៃសរុប
        $total = array_reduce($items, fn($sum, $item) => $sum + ($item['price'] * $item['quantity']), 0);

        jsonResponse(['items' => $items, 'total' => round($total, 2)]);
        break;

    // ---------------------------------------------------
    // បន្ថែមចូលកន្ត្រក (ឬបើមានរួចហើយ បន្ថែម quantity)
    // ---------------------------------------------------
    case 'POST':
        $data = getJsonBody();
        if (empty($data['book_id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ book_id'], 400);
        }
        $quantity = $data['quantity'] ?? 1;

        // ពិនិត្យថាសៀវភៅនៅមានស្តុកគ្រប់គ្រាន់ដែរឬទេ
        $bookStmt = $pdo->prepare('SELECT stock FROM books WHERE id = :id');
        $bookStmt->execute(['id' => $data['book_id']]);
        $book = $bookStmt->fetch();
        if (!$book) {
            jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ'], 404);
        }
        if ($book['stock'] < $quantity) {
            jsonResponse(['error' => 'ស្តុកមិនគ្រប់គ្រាន់'], 400);
        }

        // UNIQUE(user_id, book_id) ក្នុង schema ធ្វើឲ្យយើងអាច "upsert" បាន
        $stmt = $pdo->prepare(
            'INSERT INTO cart_items (user_id, book_id, quantity)
             VALUES (:user_id, :book_id, :quantity)
             ON CONFLICT (user_id, book_id)
             DO UPDATE SET quantity = cart_items.quantity + :quantity2
             RETURNING *'
        );
        $stmt->execute([
            'user_id' => $user['id'],
            'book_id' => $data['book_id'],
            'quantity' => $quantity,
            'quantity2' => $quantity,
        ]);

        jsonResponse($stmt->fetch(), 201);
        break;

    // ---------------------------------------------------
    // ប្តូរ quantity របស់ item មួយក្នុងកន្ត្រក
    // ---------------------------------------------------
    case 'PUT':
        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ ?id= របស់ cart item'], 400);
        }
        $data = getJsonBody();
        if (empty($data['quantity']) || $data['quantity'] < 1) {
            jsonResponse(['error' => 'quantity ត្រូវតែធំជាង 0'], 400);
        }

        $stmt = $pdo->prepare(
            'UPDATE cart_items SET quantity = :quantity
             WHERE id = :id AND user_id = :user_id
             RETURNING *'
        );
        $stmt->execute([
            'quantity' => $data['quantity'],
            'id' => $_GET['id'],
            'user_id' => $user['id'], // សុវត្ថិភាព: កុំឲ្យអ្នកប្រើប្រាស់ម្នាក់កែកន្ត្រកអ្នកដទៃ
        ]);

        $updated = $stmt->fetch();
        if (!$updated) {
            jsonResponse(['error' => 'រកមិនឃើញ ឬមិនមែនកន្ត្រករបស់អ្នកទេ'], 404);
        }
        jsonResponse($updated);
        break;

    // ---------------------------------------------------
    // យកចេញពីកន្ត្រក
    // ---------------------------------------------------
    case 'DELETE':
        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ ?id= របស់ cart item'], 400);
        }

        $stmt = $pdo->prepare(
            'DELETE FROM cart_items WHERE id = :id AND user_id = :user_id RETURNING id'
        );
        $stmt->execute(['id' => $_GET['id'], 'user_id' => $user['id']]);

        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'រកមិនឃើញ ឬមិនមែនកន្ត្រករបស់អ្នកទេ'], 404);
        }
        jsonResponse(['message' => 'បានយកចេញពីកន្ត្រកហើយ']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
