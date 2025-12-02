import React, { useState } from 'react';
import { Car, Plus, Edit2, Trash2, X } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function SavedVehicles({ vehicles, userData, onRefresh }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [vehicleData, setVehicleData] = useState({
        make: '',
        model: '',
        year: '',
        color: ''
    });

    async function handleSaveVehicle() {
        if (!userData?.id) {
            alert('User data not loaded');
            return;
        }

        if (!vehicleData.make || !vehicleData.model || !vehicleData.year) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            if (editingVehicle) {
                await updateDoc(
                    doc(db, 'customer', userData.id, 'vehicles', editingVehicle.id),
                    vehicleData
                );
                alert('Vehicle updated successfully!');
            } else {
                await addDoc(
                    collection(db, 'customer', userData.id, 'vehicles'),
                    {
                        ...vehicleData,
                        createdAt: serverTimestamp()
                    }
                );
                alert('Vehicle added successfully!');
            }

            setShowAddModal(false);
            setEditingVehicle(null);
            setVehicleData({ make: '', model: '', year: '', color: '' });
            onRefresh();
        } catch (error) {
            console.error('Error saving vehicle:', error);
            alert('Failed to save vehicle');
        }
    }

    async function handleDeleteVehicle(vehicleId) {
        if (!confirm('Are you sure you want to delete this vehicle?')) return;

        try {
            await deleteDoc(doc(db, 'customer', userData.id, 'vehicles', vehicleId));
            alert('Vehicle deleted successfully!');
            onRefresh();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            alert('Failed to delete vehicle');
        }
    }

    function openEditModal(vehicle) {
        setEditingVehicle(vehicle);
        setVehicleData({
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color
        });
        setShowAddModal(true);
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Saved Vehicles</h2>
                <button
                    onClick={() => {
                        setEditingVehicle(null);
                        setVehicleData({ make: '', model: '', year: '', color: '' });
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                >
                    <Plus className="w-5 h-5" />
                    Add Vehicle
                </button>
            </div>

            {vehicles.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No saved vehicles</h3>
                    <p className="text-gray-600 mb-4">Add your vehicles for faster booking</p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                    >
                        Add Your First Vehicle
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                    </h3>
                                    {vehicle.color && <p className="text-gray-600">{vehicle.color}</p>}
                                </div>
                                <Car className="w-8 h-8 text-gray-400" />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openEditModal(vehicle)}
                                    className="flex items-center gap-2 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDeleteVehicle(vehicle.id)}
                                    className="flex items-center gap-2 px-3 py-2 border-2 border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 relative">
                        <button
                            onClick={() => {
                                setShowAddModal(false);
                                setEditingVehicle(null);
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            {editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                                <input
                                    type="text"
                                    value={vehicleData.make}
                                    onChange={(e) => setVehicleData({ ...vehicleData, make: e.target.value })}
                                    placeholder="Tesla, Honda, Ford..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                                <input
                                    type="text"
                                    value={vehicleData.model}
                                    onChange={(e) => setVehicleData({ ...vehicleData, model: e.target.value })}
                                    placeholder="Model 3, Civic, F-150..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                                <input
                                    type="number"
                                    value={vehicleData.year}
                                    onChange={(e) => setVehicleData({ ...vehicleData, year: e.target.value })}
                                    placeholder="2023"
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <input
                                    type="text"
                                    value={vehicleData.color}
                                    onChange={(e) => setVehicleData({ ...vehicleData, color: e.target.value })}
                                    placeholder="White, Black, Red..."
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-600 focus:outline-none"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveVehicle}
                            className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700"
                        >
                            {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

