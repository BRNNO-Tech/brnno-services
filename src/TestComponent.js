import React from 'react';

const TestComponent = () => {
    return (
        <div className="min-h-screen bg-blue-500 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg shadow-lg">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Test Component</h1>
                <p className="text-gray-600">If you can see this styled properly, Tailwind is working!</p>
                <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
                    Test Button
                </button>
            </div>
        </div>
    );
};

export default TestComponent;
