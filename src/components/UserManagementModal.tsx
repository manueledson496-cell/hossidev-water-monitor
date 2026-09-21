import React from 'react';
import { SettingsModal } from './SettingsModal';
import { AuthUser } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onUserUpdated?: (updatedUser: AuthUser) => void;
  onSystemConfigChanged?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = (props) => {
  return <SettingsModal {...props} />;
};

export default UserManagementModal;
