import type { SQLiteDatabase } from 'expo-sqlite';
import type { Category, Task } from '../types';

type TaskRow = {
  id: string;
  title: string;
  description: string;
  completed: number;
  dueDateTime: string | null;
  createdAt: string;
  categoryId: string | null;
  categoryName: string | null;
  notificationId: string | null;
};

export async function migrateDatabase(database: SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL COLLATE NOCASE UNIQUE
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      dueDateTime TEXT,
      createdAt TEXT NOT NULL,
      categoryId TEXT REFERENCES categories(id) ON DELETE SET NULL,
      notificationId TEXT
    );

    CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(createdAt);
    CREATE INDEX IF NOT EXISTS tasks_category_id_idx ON tasks(categoryId);
  `);
}

export function createId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

function mapTask(row: TaskRow): Task {
  return {
    ...row,
    completed: row.completed === 1,
  };
}

export async function getTasks(database: SQLiteDatabase): Promise<Task[]> {
  const rows = await database.getAllAsync<TaskRow>(`
    SELECT tasks.*, categories.name AS categoryName
    FROM tasks
    LEFT JOIN categories ON categories.id = tasks.categoryId
    ORDER BY tasks.completed ASC, tasks.createdAt DESC
  `);
  return rows.map(mapTask);
}

export async function getTask(database: SQLiteDatabase, id: string): Promise<Task | null> {
  const row = await database.getFirstAsync<TaskRow>(
    `SELECT tasks.*, categories.name AS categoryName
     FROM tasks
     LEFT JOIN categories ON categories.id = tasks.categoryId
     WHERE tasks.id = ?`,
    id,
  );
  return row ? mapTask(row) : null;
}

export async function getCategories(database: SQLiteDatabase): Promise<Category[]> {
  return database.getAllAsync<Category>(
    'SELECT id, name FROM categories ORDER BY name COLLATE NOCASE ASC',
  );
}

export async function saveTask(database: SQLiteDatabase, task: Task) {
  await database.runAsync(
    `INSERT INTO tasks
      (id, title, description, completed, dueDateTime, createdAt, categoryId, notificationId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       description = excluded.description,
       completed = excluded.completed,
       dueDateTime = excluded.dueDateTime,
       categoryId = excluded.categoryId`,
    task.id,
    task.title,
    task.description,
    task.completed ? 1 : 0,
    task.dueDateTime,
    task.createdAt,
    task.categoryId,
    task.notificationId,
  );
}

export async function setTaskNotificationId(
  database: SQLiteDatabase,
  taskId: string,
  notificationId: string | null,
) {
  await database.runAsync(
    'UPDATE tasks SET notificationId = ? WHERE id = ?',
    notificationId,
    taskId,
  );
}

export async function setTaskCompleted(
  database: SQLiteDatabase,
  taskId: string,
  completed: boolean,
) {
  await database.runAsync(
    'UPDATE tasks SET completed = ? WHERE id = ?',
    completed ? 1 : 0,
    taskId,
  );
}

export async function deleteTask(database: SQLiteDatabase, taskId: string) {
  await database.runAsync('DELETE FROM tasks WHERE id = ?', taskId);
}

export async function saveCategory(
  database: SQLiteDatabase,
  id: string | null,
  name: string,
) {
  if (id) {
    await database.runAsync('UPDATE categories SET name = ? WHERE id = ?', name, id);
    return;
  }
  await database.runAsync(
    'INSERT INTO categories (id, name) VALUES (?, ?)',
    createId(),
    name,
  );
}

export async function deleteCategory(database: SQLiteDatabase, categoryId: string) {
  await database.runAsync('DELETE FROM categories WHERE id = ?', categoryId);
}
