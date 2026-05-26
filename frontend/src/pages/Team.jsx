import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'sonner';
import { Users, UserPlus, Mail, Shield, ShieldCheck, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const Team = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  
  const isAdmin = user?.role === 'ORG_ADMIN';

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleInvited = (newUser) => {
      setMembers((prev) => [...prev, newUser]);
      if (newUser._id !== user._id) {
        toast.info(`${newUser.name} joined the team!`);
      }
    };

    const handleUpdated = (updatedUser) => {
      setMembers((prev) => prev.map(m => m._id === updatedUser._id ? updatedUser : m));
    };

    const handleRemoved = (userId) => {
      setMembers((prev) => prev.filter(m => m._id !== userId));
    };

    socket.on('USER_INVITED', handleInvited);
    socket.on('USER_UPDATED', handleUpdated);
    socket.on('USER_REMOVED', handleRemoved);

    return () => {  
      socket.off('USER_INVITED', handleInvited);
      socket.off('USER_UPDATED', handleUpdated);
      socket.off('USER_REMOVED', handleRemoved);
    };
  }, [socket, user._id]);

  const fetchTeam = async () => {
    try {
      const { data } = await api.get('/users');
      setMembers(data.data);
    } catch (error) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsInviting(true);
    try {
      const response = await api.post('/users/invite', formData);
      
      if (response.data.previewUrl) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span>Member added successfully!</span>
            <a href={response.data.previewUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline text-xs font-semibold">
              View Sent Email
            </a>
          </div>,
          { duration: 8000 }
        );
      } else {
        toast.success('Member added successfully');
      }
      
      setFormData({ name: '', email: '', password: '' });
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (targetUserId, newRole) => {
    try {
      await api.patch(`/users/${targetUserId}/role`, { role: newRole });
      toast.success('Role updated successfully');
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update role');
      fetchTeam(); // revert UI
    }
  };

  const handleRemove = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to remove this user from the organization? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/users/${targetUserId}`);
      toast.success('User removed successfully');
      fetchTeam();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
          <p className="text-sm text-gray-500">Manage your organization's members</p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-3' : ''} gap-6`}>
        {/* Member List */}
        <div className={`${isAdmin ? 'lg:col-span-2' : ''} bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden`}>
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Current Members</h3>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
              {members.length} Members
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-gray-500 animate-pulse">Loading members...</div>
            ) : members.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No team members found.</div>
            ) : (
              members.map((member) => (
                <div key={member._id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900">{member.name} {member._id === user._id && '(You)'}</h4>
                      <p className="text-sm text-gray-500 flex items-center mt-0.5">
                        <Mail className="w-3 h-3 mr-1" /> {member.email}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 sm:ml-auto">
                    {/* Role Dropdown or Badge */}
                    {isAdmin && member._id !== user._id ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member._id, e.target.value)}
                        className="text-sm border-gray-300 rounded-lg py-1 pl-2 pr-8 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      >
                        <option value="ORG_ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                    ) : (
                      member.role === 'ORG_ADMIN' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <ShieldCheck className="w-3 h-3 mr-1" /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                          <Users className="w-3 h-3 mr-1" /> Member
                        </span>
                      )
                    )}

                    {/* Remove Button */}
                    {isAdmin && member._id !== user._id && (
                      <button
                        onClick={() => handleRemove(member._id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Invite Form (Admins Only) */}
        {isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Invite Member</h3>
          </div>
          
          <form onSubmit={handleInvite} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Temporary Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isInviting}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            >
              {isInviting ? 'Inviting...' : 'Send Invitation'}
            </button>
          </form>
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-xs flex items-start">
            <Shield className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
            <p>New members will be granted <strong>read-only access</strong> (MEMBER role) to this organization's projects.</p>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Team;
