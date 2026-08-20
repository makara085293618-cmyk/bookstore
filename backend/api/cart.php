<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();
$user = requireAuth($pdo);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

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

        $total = array_reduce($items, fn($sum, $item) => $sum + ($item['price'] * $item['quantity']), 0);

        jsonResponse(['items' => $items, 'total' => round($total, 2)]);
        break;

    case 'POST':
        $data = getJsonBody();
        if (empty($data['book_id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ book_id'], 400);
        }
        $quantity = $data['quantity'] ?? 1;

        $bookStmt = $pdo->prepare('SELECT stock FROM books WHERE id = :id');
        $bookStmt->execute(['id' => $data['book_id']]);
        $book = $bookStmt->fetch();
        if (!$book) {
            jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ'], 404);
        }
        if ($book['stock'] < $quantity) {
            jsonResponse(['error' => 'ស្តុកមិនគ្រប់គ្រាន់'], 400);
        }

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
            'user_id' => $user['id'],
        ]);

        $updated = $stmt->fetch();
        if (!$updated) {
            jsonResponse(['error' => 'រកមិនឃើញ ឬមិនមែនកន្ត្រករបស់អ្នកទេ'], 404);
        }
        jsonResponse($updated);
        break;

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
