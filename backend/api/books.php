<?php
/**
 * =========================================================
 *  books.php — API សម្រាប់សៀវភៅ
 * =========================================================
 *   GET    /api/books.php               -> បញ្ជីសៀវភៅទាំងអស់ (ebook_url លាក់)
 *   GET    /api/books.php?id=5          -> សៀវភៅមួយក្បាល (ebook_url លាក់)
 *   GET    /api/books.php?search=...    -> ស្វែងរកតាមចំណងជើង/អ្នកនិពន្ធ
 *   GET    /api/books.php?category=...  -> ច្រោះតាមប្រភេទ
 *   POST   /api/books.php               -> បង្កើតសៀវភៅថ្មី (admin ប៉ុណ្ណោះ)
 *   PUT    /api/books.php?id=5          -> កែប្រែសៀវភៅ (admin ប៉ុណ្ណោះ)
 *   DELETE /api/books.php?id=5          -> លុបសៀវភៅ (admin ប៉ុណ្ណោះ)
 *
 * ⚠️ ebook_url មិនត្រូវបានបញ្ចូលក្នុងលទ្ធផលសាធារណៈទេ (សុវត្ថិភាព) —
 *     link ទាញយកបង្ហាញឲ្យតែអ្នកទិញរួច តាមរយៈ orders.php ប៉ុណ្ណោះ។
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];
$PUBLIC_COLUMNS = 'id, title, author, description, price, stock, category, image_url, created_at';

switch ($method) {

    case 'GET':
        if (isset($_GET['id'])) {
            $stmt = $pdo->prepare("SELECT $PUBLIC_COLUMNS FROM books WHERE id = :id");
            $stmt->execute(['id' => $_GET['id']]);
            $book = $stmt->fetch();

            if (!$book) {
                jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ (Book not found)'], 404);
            }
            jsonResponse($book);
        } else {
            $conditions = [];
            $params = [];

            if (!empty($_GET['category'])) {
                $conditions[] = 'category = :category';
                $params['category'] = $_GET['category'];
            }
            if (!empty($_GET['search'])) {
                $conditions[] = '(title ILIKE :search OR author ILIKE :search)';
                $params['search'] = '%' . $_GET['search'] . '%';
            }

            $sql = "SELECT $PUBLIC_COLUMNS FROM books";
            if ($conditions) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }
            $sql .= ' ORDER BY id';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            jsonResponse($stmt->fetchAll());
        }
        break;

    case 'POST':
        requireAdmin($pdo);

        $data = getJsonBody();
        $required = ['title', 'author', 'price', 'stock'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                jsonResponse(['error' => "សូមបំពេញ field: $field"], 400);
            }
        }

        $stmt = $pdo->prepare(
            'INSERT INTO books (title, author, description, price, stock, category, image_url, ebook_url)
             VALUES (:title, :author, :description, :price, :stock, :category, :image_url, :ebook_url)
             RETURNING *'
        );
        $stmt->execute([
            'title' => $data['title'],
            'author' => $data['author'],
            'description' => $data['description'] ?? '',
            'price' => $data['price'],
            'stock' => $data['stock'],
            'category' => $data['category'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'ebook_url' => $data['ebook_url'] ?? null,
        ]);

        jsonResponse($stmt->fetch(), 201);
        break;

    case 'PUT':
        requireAdmin($pdo);

        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ ?id= របស់សៀវភៅដែលចង់កែ'], 400);
        }

        $data = getJsonBody();
        $stmt = $pdo->prepare(
            'UPDATE books SET
                title = :title, author = :author, description = :description,
                price = :price, stock = :stock, category = :category,
                image_url = :image_url, ebook_url = :ebook_url
             WHERE id = :id
             RETURNING *'
        );
        $stmt->execute([
            'id' => $_GET['id'],
            'title' => $data['title'],
            'author' => $data['author'],
            'description' => $data['description'] ?? '',
            'price' => $data['price'],
            'stock' => $data['stock'],
            'category' => $data['category'] ?? null,
            'image_url' => $data['image_url'] ?? null,
            'ebook_url' => $data['ebook_url'] ?? null,
        ]);

        $updated = $stmt->fetch();
        if (!$updated) {
            jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ'], 404);
        }
        jsonResponse($updated);
        break;

    case 'DELETE':
        requireAdmin($pdo);

        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ ?id= របស់សៀវភៅដែលចង់លុប'], 400);
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM books WHERE id = :id RETURNING id');
            $stmt->execute(['id' => $_GET['id']]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23503') {
                jsonResponse([
                    'error' => 'មិនអាចលុបសៀវភៅនេះបានទេ ព្រោះមានវានៅក្នុងកម្មង់ទិញរបស់អតិថិជនរួចហើយ។ សូមកែស្តុកទៅ 0 ជំនួសវិញ ដើម្បីលាក់វាចេញពីការលក់។',
                ], 409);
            }
            throw $e;
        }

        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ'], 404);
        }
        jsonResponse(['message' => 'បានលុបសៀវភៅដោយជោគជ័យ']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
