<?php
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();
$user = requireAuth($pdo);

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    case 'GET':
        if (isset($_GET['id'])) {
            $orderStmt = $pdo->prepare('SELECT * FROM orders WHERE id = :id AND user_id = :user_id');
            $orderStmt->execute(['id' => $_GET['id'], 'user_id' => $user['id']]);
            $order = $orderStmt->fetch();

            if (!$order) {
                jsonResponse(['error' => 'រកមិនឃើញកម្មង់ទិញនេះទេ'], 404);
            }

            // ebook_url បញ្ចូលនៅទីនេះតែប៉ុណ្ណោះ ព្រោះ query នេះត្រូវបាន filter រួចហើយ
            // ថា order នេះជារបស់ user ដែល login (WHERE user_id = :user_id ខាងលើ)
            $itemsStmt = $pdo->prepare(
                'SELECT oi.quantity, oi.price, b.title, b.image_url, b.ebook_url
                 FROM order_items oi JOIN books b ON b.id = oi.book_id
                 WHERE oi.order_id = :order_id'
            );
            $itemsStmt->execute(['order_id' => $_GET['id']]);
            $order['items'] = $itemsStmt->fetchAll();

            jsonResponse($order);
        } else {
            $stmt = $pdo->prepare('SELECT * FROM orders WHERE user_id = :user_id ORDER BY created_at DESC');
            $stmt->execute(['user_id' => $user['id']]);
            jsonResponse($stmt->fetchAll());
        }
        break;

    case 'POST':
        $cartStmt = $pdo->prepare(
            'SELECT c.book_id, c.quantity, b.price, b.stock, b.title
             FROM cart_items c JOIN books b ON b.id = c.book_id
             WHERE c.user_id = :user_id'
        );
        $cartStmt->execute(['user_id' => $user['id']]);
        $cartItems = $cartStmt->fetchAll();

        if (empty($cartItems)) {
            jsonResponse(['error' => 'កន្ត្រករបស់អ្នកទទេ'], 400);
        }

        foreach ($cartItems as $item) {
            if ($item['quantity'] > $item['stock']) {
                jsonResponse(['error' => "សៀវភៅ \"{$item['title']}\" នៅសល់តែ {$item['stock']} ក្បាល"], 400);
            }
        }

        $total = array_reduce($cartItems, fn($sum, $i) => $sum + ($i['price'] * $i['quantity']), 0);

        try {
            $pdo->beginTransaction();

            $orderStmt = $pdo->prepare(
                'INSERT INTO orders (user_id, total, status) VALUES (:user_id, :total, :status) RETURNING *'
            );
            $orderStmt->execute(['user_id' => $user['id'], 'total' => round($total, 2), 'status' => 'pending']);
            $order = $orderStmt->fetch();

            $itemStmt = $pdo->prepare(
                'INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (:order_id, :book_id, :quantity, :price)'
            );
            $stockStmt = $pdo->prepare('UPDATE books SET stock = stock - :quantity WHERE id = :id');

            foreach ($cartItems as $item) {
                $itemStmt->execute([
                    'order_id' => $order['id'],
                    'book_id' => $item['book_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                ]);
                $stockStmt->execute(['quantity' => $item['quantity'], 'id' => $item['book_id']]);
            }

            $clearStmt = $pdo->prepare('DELETE FROM cart_items WHERE user_id = :user_id');
            $clearStmt->execute(['user_id' => $user['id']]);

            $pdo->commit();

            jsonResponse($order, 201);
        } catch (Exception $e) {
            $pdo->rollBack();
            jsonResponse(['error' => 'ការកម្មង់ទិញបរាជ័យ', 'details' => $e->getMessage()], 500);
        }
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
