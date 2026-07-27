import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface EventTask {
  id: string;
  festival_id: string;
  task_name: string;
  assigned_to_name: string;
  budget_allocated: number;
  due_date?: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'accepted';
  notes?: string;
}

interface TaskStore {
  tasks: EventTask[];
  addTask: (task: EventTask) => void;
  updateTask: (taskId: string, updates: Partial<EventTask>) => void;
  deleteTask: (taskId: string) => void;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task) => set((state) => ({ tasks: [task, ...state.tasks] })),
      updateTask: (taskId, updates) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === taskId ? { ...t, ...updates } : t)
      })),
      deleteTask: (taskId) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== taskId)
      }))
    }),
    {
      name: 'hissob-task-storage', // saves to localStorage
    }
  )
);
