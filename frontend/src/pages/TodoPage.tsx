import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Clock, CheckCircle, Circle, AlertTriangle, User, Calendar } from 'lucide-react';
import api from '../services/api';
import { Todo, User as UserType } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select, TextArea } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

const TodoPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch todos
  const { data: todosData, isLoading } = useQuery({
    queryKey: ['todos', statusFilter, priorityFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      
      const response = await api.get(`/todos?${params}`);
      return response.data;
    },
  });

  const todos: Todo[] = todosData?.data || [];

  const todosByStatus = {
    TODO: todos.filter((t) => t.status === 'TODO'),
    IN_PROGRESS: todos.filter((t) => t.status === 'IN_PROGRESS'),
    DONE: todos.filter((t) => t.status === 'DONE'),
  };

  const handleViewHistory = (todo: Todo) => {
    setSelectedTodo(todo);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Todo Management</h2>
          {user?.role === 'RECEPTIONIST' && (
            <Button onClick={() => setIsAddModalOpen(true)}>
              <Plus size={20} className="mr-2" />
              Create Todo
            </Button>
          )}
        </div>
      </Card>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
          <div className="flex-1">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priority</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading todos...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <TodoColumn
            title="To Do"
            status="TODO"
            todos={todosByStatus.TODO}
            icon={<Circle className="h-5 w-5 text-gray-500" />}
            onViewHistory={handleViewHistory}
          />
          <TodoColumn
            title="In Progress"
            status="IN_PROGRESS"
            todos={todosByStatus.IN_PROGRESS}
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            onViewHistory={handleViewHistory}
          />
          <TodoColumn
            title="Done"
            status="DONE"
            todos={todosByStatus.DONE}
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            onViewHistory={handleViewHistory}
          />
        </div>
      )}

      {/* Add Todo Modal */}
      <AddTodoModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* History Modal */}
      {selectedTodo && (
        <TodoHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedTodo(null);
          }}
          todo={selectedTodo}
        />
      )}
    </div>
  );
};

// Todo Column Component
interface TodoColumnProps {
  title: string;
  status: string;
  todos: Todo[];
  icon: React.ReactNode;
  onViewHistory: (todo: Todo) => void;
}

const TodoColumn: React.FC<TodoColumnProps> = ({ title, status, todos, icon, onViewHistory }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Only Principal and Vice Principal can update status
  const canUpdateStatus = ['PRINCIPAL', 'VICE_PRINCIPAL'].includes(user?.role || '');

  const updateStatusMutation = useMutation({
    mutationFn: async ({ todoId, newStatus }: { todoId: string; newStatus: string }) => {
      const response = await api.patch(`/todos/${todoId}/status`, { status: newStatus });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Todo status updated!');
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update status');
    },
  });

  const handleStatusChange = (todoId: string, newStatus: string) => {
    updateStatusMutation.mutate({ todoId, newStatus });
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'URGENT' || priority === 'HIGH') {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {todos.length}
        </span>
      </div>

      <div className="space-y-3">
        {todos.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">No todos</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{todo.title}</h4>
                    {getPriorityIcon(todo.priority)}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{todo.description}</p>
                </div>
                <Badge
                  variant={
                    todo.priority === 'URGENT'
                      ? 'danger'
                      : todo.priority === 'HIGH'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {todo.priority}
                </Badge>
              </div>

              <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  <span>{typeof todo.assignedTo === 'object' ? todo.assignedTo?.fullName : 'Unassigned'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(todo.createdAt)}</span>
                </div>
              </div>

              {todo.category && (
                <div className="mt-2">
                  <Badge variant="info">{todo.category}</Badge>
                </div>
              )}

              {canUpdateStatus && status !== 'DONE' && (
                <div className="mt-3 flex gap-2">
                  {status === 'TODO' && (
                    <button
                      onClick={() => handleStatusChange(todo.id, 'IN_PROGRESS')}
                      className="flex-1 rounded bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                      Start
                    </button>
                  )}
                  {status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(todo.id, 'TODO')}
                        className="flex-1 rounded bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Move to Todo
                      </button>
                      <button
                        onClick={() => handleStatusChange(todo.id, 'DONE')}
                        className="flex-1 rounded bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100"
                      >
                        Complete
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => onViewHistory(todo)}
                className="mt-2 w-full text-center text-sm text-blue-600 hover:text-blue-800"
              >
                View History
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

// Add Todo Modal Component
interface AddTodoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTodoModal: React.FC<AddTodoModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    category: '',
    assignedToId: '',
  });

  const queryClient = useQueryClient();

  // Fetch principals and vice principals
  const { data: usersData } = useQuery({
    queryKey: ['principalUsers'],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const principals =
    usersData?.data?.filter(
      (u: UserType) => u.role === 'PRINCIPAL' || u.role === 'VICE_PRINCIPAL'
    ) || [];

  const addTodoMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/todos', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Todo created successfully!');
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      onClose();
      setFormData({
        title: '',
        description: '',
        priority: 'MEDIUM',
        category: '',
        assignedToId: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create todo');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTodoMutation.mutate(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Todo"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addTodoMutation.isPending}>
            {addTodoMutation.isPending ? 'Creating...' : 'Create Todo'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <TextArea
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={4}
          required
        />

        <Select
          label="Priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          options={[
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'URGENT', label: 'Urgent' },
          ]}
          required
        />

        <Input
          label="Category (Optional)"
          name="category"
          value={formData.category}
          onChange={handleChange}
          placeholder="e.g. Maintenance, Academic, Administrative"
        />

        <Select
          label="Assign To"
          name="assignedToId"
          value={formData.assignedToId}
          onChange={handleChange}
          options={principals.map((u: UserType) => ({
            value: u.id,
            label: `${u.fullName} (${u.role})`,
          }))}
          required
        />
      </form>
    </Modal>
  );
};

// Todo History Modal Component
interface TodoHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  todo: Todo;
}

const TodoHistoryModal: React.FC<TodoHistoryModalProps> = ({ isOpen, onClose, todo }) => {
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['todoHistory', todo.id],
    queryFn: async () => {
      const response = await api.get(`/todos/${todo.id}/history`);
      return response.data;
    },
    enabled: isOpen,
  });

  const history = historyData?.data || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Todo History" size="md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{todo.title}</h3>
        <p className="mt-1 text-sm text-gray-600">{todo.description}</p>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading history...</div>
      ) : history.length === 0 ? (
        <div className="py-8 text-center text-gray-500">No history available</div>
      ) : (
        <div className="space-y-3">
          {history.map((entry: any, index: number) => (
            <div key={entry.id || index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                {index < history.length - 1 && (
                  <div className="h-full w-0.5 bg-gray-200"></div>
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Status changed to: <Badge status={entry.newStatus}>{entry.newStatus}</Badge>
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      by {entry.changedBy?.fullName || 'System'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(entry.changedAt)}</span>
                </div>
                {entry.remarks && (
                  <p className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">Remarks:</span> {entry.remarks}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};

export default TodoPage;
