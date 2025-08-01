import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  MoreVertical,
  Settings,
  Key,
  Globe
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Table, 
  Badge, 
  Modal, 
  ModalBody, 
  ModalFooter
} from '../../components/ui';
import { ApplicationForm } from '../../components/forms';
import { useApplications } from '../../hooks';
import type { Application, CreateApplicationRequest, UpdateApplicationRequest } from '../../types';
import { utils, formatUtils } from '../../utils';

const ApplicationsPage: React.FC = () => {
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [applicationToDelete, setApplicationToDelete] = useState<Application | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  const {
    applications,
    loading,
    pagination,
    setSearch,
    setPage,
    createApplication,
    updateApplication,
    deleteApplication,
    regenerateAPIKey,
  } = useApplications();

  // Debounced search
  const debouncedSearch = useMemo(
    () => utils.debounce((value: string) => setSearch(value), 300),
    [setSearch]
  );

  // Handle search input
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSearch(e.target.value);
  };

  // Handle create application
  const handleCreateApplication = () => {
    setSelectedApplication(null);
    setShowApplicationForm(true);
  };

  // Handle edit application
  const handleEditApplication = (application: Application) => {
    setSelectedApplication(application);
    setShowApplicationForm(true);
  };

  // Handle delete application
  const handleDeleteApplication = (application: Application) => {
    setApplicationToDelete(application);
    setShowDeleteModal(true);
  };

  // Handle form submit (placeholder - will implement when ApplicationForm is created)
  const handleFormSubmit = async (data: CreateApplicationRequest | UpdateApplicationRequest) => {
    setFormLoading(true);
    try {
      if (selectedApplication) {
        await updateApplication(selectedApplication.id, data as UpdateApplicationRequest);
      } else {
        await createApplication(data as CreateApplicationRequest);
      }
      setShowApplicationForm(false);
      setSelectedApplication(null);
    } catch (error) {
      // Error handled by useApplications hook
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete confirm
  const handleDeleteConfirm = async () => {
    if (!applicationToDelete) return;

    try {
      await deleteApplication(applicationToDelete.id);
      setShowDeleteModal(false);
      setApplicationToDelete(null);
    } catch (error) {
      // Error handled by useApplications hook
    }
  };

  // Handle regenerate API key
  const handleRegenerateAPIKey = async (application: Application) => {
    try {
      const newApiKey = await regenerateAPIKey(application.id);
      // TODO: Show API key in a modal for the user to copy
      console.log('New API Key:', newApiKey);
    } catch (error) {
      // Error handled by useApplications hook
    }
  };

  // Table columns
  const columns = [
    {
      key: 'name',
      label: 'Application',
      sortable: true,
      render: (value: string, record: Application) => (
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
            <Globe className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-base-content">{value}</div>
            <div className="text-sm text-base-content/70">{record.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'is_system',
      label: 'Type',
      sortable: true,
      render: (value: boolean) => (
        <Badge
          variant={value ? 'warning' : 'primary'}
          size="sm"
        >
          {value ? (
            <>
              <Settings className="w-3 h-3 mr-1" />
              System
            </>
          ) : (
            <>
              <Globe className="w-3 h-3 mr-1" />
              User
            </>
          )}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-base-content/70">
          {formatUtils.formatDate(value)}
        </div>
      ),
    },
    {
      key: 'updated_at',
      label: 'Updated',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-base-content/70">
          {formatUtils.formatDate(value)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '120px',
      render: (_: any, record: Application) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditApplication(record)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteApplication(record)}
            disabled={record.is_system}
            title="Delete application"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <div className="dropdown dropdown-end">
            <Button
              variant="ghost"
              size="sm"
              tabIndex={0}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
            <ul
              tabIndex={0}
              className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52"
            >
              <li>
                <a onClick={() => handleRegenerateAPIKey(record)}>
                  <Key className="w-4 h-4" />
                  Regenerate API Key
                </a>
              </li>
              <li>
                <a>
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Applications</h1>
          <p className="text-base-content/70 mt-1">
            Manage registered applications and their API access
          </p>
        </div>
        <Button
          variant="primary"
          onClick={handleCreateApplication}
          icon={Plus}
        >
          Create Application
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search applications..."
            icon={Search}
            onChange={handleSearchChange}
            fullWidth
          />
        </div>
        <Button variant="outline" icon={Filter}>
          Filters
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">Total Applications</div>
          <div className="stat-value text-primary">{pagination.total}</div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">User Applications</div>
          <div className="stat-value text-success">
            {applications.filter(app => !app.is_system).length}
          </div>
        </div>
        <div className="stat bg-base-100 rounded-lg shadow">
          <div className="stat-title">System Applications</div>
          <div className="stat-value text-warning">
            {applications.filter(app => app.is_system).length}
          </div>
        </div>
      </div>

      {/* Table */}
      <Table
        data={applications}
        columns={columns}
        loading={loading}
        emptyMessage="No applications found"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: setPage,
        }}
        className="w-full"
      />

      {/* Application Form Modal */}
      <ApplicationForm
        isOpen={showApplicationForm}
        onClose={() => {
          setShowApplicationForm(false);
          setSelectedApplication(null);
        }}
        onSubmit={handleFormSubmit}
        application={selectedApplication || undefined}
        loading={formLoading}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Application"
        size="sm"
      >
        <ModalBody>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-error/10 mb-4">
              <Trash2 className="h-6 w-6 text-error" />
            </div>
            <h3 className="text-lg font-medium text-base-content mb-2">
              Delete Application
            </h3>
            <p className="text-sm text-base-content/70 mb-4">
              Are you sure you want to delete{' '}
              <span className="font-medium">{applicationToDelete?.name}</span>?
              This action cannot be undone and will revoke all API access for this application.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="error"
            onClick={handleDeleteConfirm}
            icon={Trash2}
          >
            Delete Application
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default ApplicationsPage;