import React from 'react';

const StudentsPage: React.FC = () => {
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="mb-4 text-2xl font-bold">Students Management</h2>
      <p className="text-gray-600">
        This page will contain:
      </p>
      <ul className="mt-4 list-inside list-disc space-y-2 text-gray-700">
        <li>Student registration form with Sri Lankan context fields</li>
        <li>List of all students with search and filter</li>
        <li>Student profile view with guardian information</li>
        <li>Document upload functionality</li>
        <li>Class assignment and transfer</li>
        <li>Student status management (Active/Inactive)</li>
      </ul>
    </div>
  );
};

export default StudentsPage;
