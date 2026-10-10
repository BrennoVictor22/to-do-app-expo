export type Category = {
  id: string;
  name: string;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  dueDateTime: string | null;
  createdAt: string;
  categoryId: string | null;
  categoryName?: string | null;
  notificationId: string | null;
};

export type TaskStatusFilter = 'all' | 'pending' | 'completed';
