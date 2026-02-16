import { useState } from 'react';
import { CompactHeader } from './components/CompactHeader';
import { Dashboard } from './components/Dashboard';
import { AssignmentForm } from './components/AssignmentForm';
import { AssignmentList } from './components/AssignmentList';
import { useAssignments } from './hooks/useAssignments';
import { useSemesters } from './hooks/useSemesters';
import { CreateAssignmentData } from './types/database';

type TabType = 'dashboard' | 'create' | 'list';

const AssignmentTracker = () => {
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const {
        assignments,
        loading: assignmentsLoading,
        createAssignment,
        toggleAssignment,
        deleteAssignment,
        updateAssignment,
        getDashboardStats
    } = useAssignments();
    const { currentSemester, loading: semestersLoading } = useSemesters();

    const dashboardStats = getDashboardStats();
    const isLoading = assignmentsLoading || semestersLoading;

    const handleCreateAssignment = async (data: CreateAssignmentData) => {
        await createAssignment(data);
        setActiveTab('list'); // Switch to list view after creation
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <Dashboard stats={dashboardStats} assignments={assignments} loading={isLoading} />;
            case 'create':
                return (
                    <AssignmentForm
                        onSubmit={handleCreateAssignment}
                        currentSemesterId={currentSemester?.id || null}
                        loading={isLoading}
                    />
                );
            case 'list':
                return (
                    <AssignmentList
                        assignments={assignments}
                        onToggleComplete={toggleAssignment}
                        onDelete={deleteAssignment}
                        onEdit={updateAssignment}
                        loading={isLoading}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-full w-full p-8 flex flex-col items-center">
            <div className="w-full max-w-7xl">
                <CompactHeader activeTab={activeTab} onTabChange={setActiveTab} />

                <div className="mt-8">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default AssignmentTracker;
