<?php
/**
 * =========================================================
 *  books.php — API សម្រាប់សៀវភៅ
 * =========================================================
 * តើ file នេះធ្វើអ្វី? វាឆ្លើយតបទៅតាម HTTP method ដែលផ្ញើមក៖
 *
 *   GET    /api/books.php           -> បញ្ជីសៀវភៅទាំងអស់
 *   GET    /api/books.php?id=5      -> សៀវភៅមួយក្បាល (id=5)
 *   POST   /api/books.php           -> បង្កើតសៀវភៅថ្មី (admin ប៉ុណ្ណោះ)
 *   PUT    /api/books.php?id=5      -> កែប្រែសៀវភៅ (admin ប៉ុណ្ណោះ)
 *   DELETE /api/books.php?id=5      -> លុបសៀវភៅ (admin ប៉ុណ្ណោះ)
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../includes/helpers.php';

applyCors();
$pdo = getDbConnection();

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {

    // ---------------------------------------------------
    // GET — មើលបញ្ជីសៀវភៅ ឬសៀវភៅមួយក្បាល (មិនត្រូវ login ក៏បាន)
    // ---------------------------------------------------
    case 'GET':
        if (isset($_GET['id'])) {
            // សំណើមកសម្រាប់សៀវភៅមួយក្បាលជាក់លាក់
            $stmt = $pdo->prepare('SELECT * FROM books WHERE id = :id');
            $stmt->execute(['id' => $_GET['id']]);
            $book = $stmt->fetch();

            if (!$book) {
                jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ (Book not found)'], 404);
            }
            jsonResponse($book);
        } else {
            // សំណើមកសម្រាប់សៀវភៅទាំងអស់ (អាចច្រោះតាម category និង/ឬ ស្វែងរកតាមចំណងជើង/អ្នកនិពន្ធ)
            $conditions = [];
            $params = [];

            if (!empty($_GET['category'])) {
                $conditions[] = 'category = :category';
                $params['category'] = $_GET['category'];
            }
            if (!empty($_GET['search'])) {
                // ILIKE = ស្វែងរកមិនប្រកាន់អក្សរធំតូច, %...% = ស្វែងរកគ្រប់កន្លែងក្នុងពាក្យ
                $conditions[] = '(title ILIKE :search OR author ILIKE :search)';
                $params['search'] = '%' . $_GET['search'] . '%';
            }

            $sql = 'SELECT * FROM books';
            if ($conditions) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }
            $sql .= ' ORDER BY id';

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            jsonResponse($stmt->fetchAll());
        }
        break;

    // ---------------------------------------------------
    // POST — បង្កើតសៀវភៅថ្មី (admin ប៉ុណ្ណោះ)
    // ---------------------------------------------------
    case 'POST':
        requireAdmin($pdo); // ឈប់ភ្លាមៗប្រសិនបើមិនមែន admin

        $data = getJsonBody();
        $required = ['title', 'author', 'price', 'stock'];
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                jsonResponse(['error' => "សូមបំពេញ field: $field"], 400);
            }
        }

        $stmt = $pdo->prepare(
            'INSERT INTO books (title, author, description, price, stock, category, image_url)
             VALUES (:title, :author, :description, :price, :stock, :category, :image_url)
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
        ]);

        jsonResponse($stmt->fetch(), 201);
        break;

    // ---------------------------------------------------
    // PUT — កែប្រែសៀវភៅ (admin ប៉ុណ្ណោះ)
    // ---------------------------------------------------
    case 'PUT':
        requireAdmin($pdo);

        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ ?id= របស់សៀវភៅដែលចង់កែ'], 400);
        }

        $data = getJsonBody();
        $stmt = $pdo->prepare(
            'UPDATE books SET
                title = :title, author = :author, description = :description,
                price = :price, stock = :stock, category = :category, image_url = :image_url
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
        ]);

        $updated = $stmt->fetch();
        if (!$updated) {
            jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ'], 404);
        }
        jsonResponse($updated);
        break;

    // ---------------------------------------------------
    // DELETE — លុបសៀវភៅ (admin ប៉ុណ្ណោះ)
    // ---------------------------------------------------
    case 'DELETE':
        requireAdmin($pdo);

        if (!isset($_GET['id'])) {
            jsonResponse(['error' => 'សូមផ្តល់ ?id= របស់សៀវភៅដែលចង់លុប'], 400);
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM books WHERE id = :id RETURNING id');
            $stmt->execute(['id' => $_GET['id']]);
        } catch (PDOException $e) {
            // Error code 23503 = foreign key violation (សៀវភៅនេះមាននៅក្នុងកម្មង់ទិញចាស់ៗរួចហើយ)
            if ($e->getCode() === '23503') {
                jsonResponse([
                    'error' => 'មិនអាចលុបសៀវភៅនេះបានទេ ព្រោះមានវានៅក្នុងកម្មង់ទិញរបស់អតិថិជនរួចហើយ។ សូមកែស្តុកទៅ 0 ជំនួសវិញ ដើម្បីលាក់វាចេញពីការលក់។',
                ], 409);
            }
            throw $e; // error ផ្សេងទៀត -> បណ្តេញឲ្យឃើញធម្មតា
        }

        if (!$stmt->fetch()) {
            jsonResponse(['error' => 'រកសៀវភៅនេះមិនឃើញទេ'], 404);
        }
        jsonResponse(['message' => 'បានលុបសៀវភៅដោយជោគជ័យ']);
        break;

    default:
        jsonResponse(['error' => 'Method not allowed'], 405);
}
