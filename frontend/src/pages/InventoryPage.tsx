import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Package, AlertTriangle, Edit, TrendingDown } from 'lucide-react';
import api from '../services/api';
import { Inventory } from '../types';
import { Card } from '../components/UI/Card';
import { Button } from '../components/UI/Button';
import { Input, Select } from '../components/UI/Input';
import { Modal } from '../components/UI/Modal';
import { Badge } from '../components/UI/Badge';
import { formatDate } from '../utils/helpers';

const InventoryPage: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await api.get('/inventory');
      return response.data;
    },
  });

  const items: Inventory[] = inventoryData?.data || [];

  // Separate low stock items
  const lowStockItems = items.filter((item) => item.quantity <= item.minQuantity);
  const regularItems = items.filter((item) => item.quantity > item.minQuantity);

  const handleUpdateQuantity = (item: Inventory) => {
    setSelectedItem(item);
    setIsUpdateModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={20} className="mr-2" />
            Add Item
          </Button>
        </div>
      </Card>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card>
          <div className="flex items-start gap-3 rounded-lg bg-red-50 p-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
              <p className="mt-1 text-sm text-red-700">
                {lowStockItems.length} item(s) are running low on stock
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowStockItems.map((item) => (
                  <Badge key={item.id} variant="danger">
                    {item.itemName}: {item.quantity} {item.unit}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading inventory...</div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No inventory items found. Click "Add Item" to add a new item.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Item Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Quantity
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Min Quantity
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Unit
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const isLowStock = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                          {isLowStock && (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-sm font-semibold ${
                            isLowStock ? 'text-red-600' : 'text-gray-900'
                          }`}
                        >
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {item.minQuantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.location || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === 'AVAILABLE'
                              ? 'success'
                              : item.status === 'OUT_OF_STOCK'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleUpdateQuantity(item)}
                          className="rounded p-1 hover:bg-gray-100"
                          title="Update Quantity"
                        >
                          <Edit size={18} className="text-blue-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      {/* Update Quantity Modal */}
      {selectedItem && (
        <UpdateQuantityModal
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedItem(null);
          }}
          item={selectedItem}
        />
      )}
    </div>
  );
};

// Add Item Modal Component
interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    quantity: '',
    minQuantity: '',
    unit: '',
    location: '',
  });

  const queryClient = useQueryClient();

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/inventory', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Item added successfully!');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
      setFormData({
        itemName: '',
        category: '',
        quantity: '',
        minQuantity: '',
        unit: '',
        location: '',
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to add item');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData = {
      ...formData,
      quantity: parseInt(formData.quantity),
      minQuantity: parseInt(formData.minQuantity),
    };

    addItemMutation.mutate(submitData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Inventory Item"
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={addItemMutation.isPending}>
            {addItemMutation.isPending ? 'Adding...' : 'Add Item'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Item Name"
          name="itemName"
          value={formData.itemName}
          onChange={handleChange}
          required
        />

        <Select
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          options={[
            { value: 'STATIONERY', label: 'Stationery' },
            { value: 'FURNITURE', label: 'Furniture' },
            { value: 'ELECTRONICS', label: 'Electronics' },
            { value: 'BOOKS', label: 'Books' },
            { value: 'CLEANING', label: 'Cleaning Supplies' },
            { value: 'OTHER', label: 'Other' },
          ]}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            value={formData.quantity}
            onChange={handleChange}
            required
          />

          <Input
            label="Min Quantity Alert"
            name="minQuantity"
            type="number"
            value={formData.minQuantity}
            onChange={handleChange}
            required
          />
        </div>

        <Input
          label="Unit"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          placeholder="e.g. pcs, boxes, reams"
          required
        />

        <Input
          label="Location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="e.g. Store Room A, Shelf 3"
        />
      </form>
    </Modal>
  );
};

// Update Quantity Modal Component
interface UpdateQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Inventory;
}

const UpdateQuantityModal: React.FC<UpdateQuantityModalProps> = ({ isOpen, onClose, item }) => {
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'REMOVE'>('ADD');
  const [quantity, setQuantity] = useState('');
  const [remarks, setRemarks] = useState('');

  const queryClient = useQueryClient();

  const updateQuantityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.patch(`/inventory/${item.id}/quantity`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Quantity updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onClose();
      setQuantity('');
      setRemarks('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update quantity');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const adjustmentValue = parseInt(quantity);
    const newQuantity =
      adjustmentType === 'ADD' ? item.quantity + adjustmentValue : item.quantity - adjustmentValue;

    if (newQuantity < 0) {
      toast.error('Cannot remove more than available quantity');
      return;
    }

    updateQuantityMutation.mutate({
      quantity: newQuantity,
      remarks: remarks || `${adjustmentType === 'ADD' ? 'Added' : 'Removed'} ${quantity} ${item.unit}`,
    });
  };

  const newQuantity =
    adjustmentType === 'ADD'
      ? item.quantity + parseInt(quantity || '0')
      : item.quantity - parseInt(quantity || '0');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Quantity - ${item.itemName}`}
      size="md"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateQuantityMutation.isPending}>
            {updateQuantityMutation.isPending ? 'Updating...' : 'Update Quantity'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-4">
          <p className="text-sm text-gray-600">Current Quantity</p>
          <p className="text-2xl font-bold text-gray-900">
            {item.quantity} {item.unit}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAdjustmentType('ADD')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 font-medium transition ${
              adjustmentType === 'ADD'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            + Add Stock
          </button>
          <button
            type="button"
            onClick={() => setAdjustmentType('REMOVE')}
            className={`flex-1 rounded-lg border-2 px-4 py-3 font-medium transition ${
              adjustmentType === 'REMOVE'
                ? 'border-red-500 bg-red-50 text-red-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            - Remove Stock
          </button>
        </div>

        <Input
          label={`Quantity to ${adjustmentType === 'ADD' ? 'Add' : 'Remove'}`}
          name="quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />

        {quantity && (
          <div
            className={`rounded-lg p-3 ${
              newQuantity <= item.minQuantity ? 'bg-red-50' : 'bg-blue-50'
            }`}
          >
            <p className="text-sm font-medium text-gray-700">New Quantity</p>
            <p
              className={`text-xl font-bold ${
                newQuantity <= item.minQuantity ? 'text-red-600' : 'text-blue-600'
              }`}
            >
              {newQuantity} {item.unit}
            </p>
            {newQuantity <= item.minQuantity && (
              <p className="mt-1 text-xs text-red-600">⚠️ Below minimum quantity alert level</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Remarks (Optional)
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder="Add notes about this adjustment..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </form>
    </Modal>
  );
};

export default InventoryPage;
