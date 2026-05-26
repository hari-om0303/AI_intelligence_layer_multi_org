import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Edit2, Trash2, GripVertical, Calendar, Link, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ProjectCard = ({ project, onEdit, onDelete }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ORG_ADMIN';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project._id, data: { ...project } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="bg-indigo-50 border-2 border-dashed border-indigo-400 rounded-xl h-32 opacity-50"
      />
    );
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200'; // Medium
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'Bug': return 'bg-red-50 text-red-600 border-red-100';
      case 'Tech Debt': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-indigo-50 text-indigo-600 border-indigo-100'; // Feature
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow group flex flex-col"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {isAdmin && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          <h4 className="text-sm font-semibold text-gray-900 line-clamp-1">{project.title}</h4>
        </div>
        
        {isAdmin && (
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(project)}
              className="p-1 text-gray-400 hover:text-indigo-600 rounded bg-white"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(project._id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded bg-white"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      
      <p className="mt-2 text-xs text-gray-500 line-clamp-2 pl-6">
        {project.description || 'No description.'}
      </p>

      <div className="mt-3 pl-6 flex flex-wrap gap-2">
        {project.priority && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getPriorityColor(project.priority)}`}>
            {project.priority}
          </span>
        )}
        {project.type && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getTypeColor(project.type)}`}>
            {project.type}
          </span>
        )}
      </div>
      
      <div className="mt-4 flex flex-col gap-2 pl-6 text-xs text-gray-400 border-t border-gray-50 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{project.dueDate ? new Date(project.dueDate).toLocaleDateString() : 'No Due Date'}</span>
          </div>
          {project.githubIssueUrl && (
            <a href={project.githubIssueUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-600 transition-colors" title="View Issue Link">
              <Link className="w-4 h-4" />
            </a>
          )}
        </div>
        
        <div className="flex flex-col gap-1 w-full">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px]">Created {new Date(project.createdAt).toLocaleDateString()}</span>
            {project.healthScore !== undefined && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                project.healthStatus === 'Critical' ? 'bg-red-100 text-red-700' : 
                project.healthStatus === 'Warning' ? 'bg-orange-100 text-orange-700' : 
                'bg-green-100 text-green-700'
              }`}>
                {project.healthScore}% {project.healthStatus}
              </span>
            )}
          </div>
          {project.recommendation && (
            <div className="text-[10px] bg-gray-50 text-gray-600 px-2 py-1 rounded border border-gray-100 mt-1">
              💡 {project.recommendation}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
