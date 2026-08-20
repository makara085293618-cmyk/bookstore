-- បន្ថែម column ebook_url សម្រាប់មុខងារទាញយក Ebook
-- (Run នេះក្នុង Neon SQL Editor - ធ្វើតែម្តងគត់)
ALTER TABLE books ADD COLUMN IF NOT EXISTS ebook_url VARCHAR(500);
