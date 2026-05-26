import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ProjectCard from './ProjectCard';

const KanbanColumn = ({ id, title, projects, onEdit, onDelete }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div className="flex flex-col bg-gray-50 rounded-2xl w-full min-w-[300px] flex-shrink-0 border border-gray-200">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-700">{title}</h3>
        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
          {projects.length}
        </span>
      </div>
      
      <div ref={setNodeRef} className="flex-1 p-3 flex flex-col gap-3 min-h-[200px]">
        <SortableContext items={projects.map((p) => p._id)} strategy={verticalListSortingStrategy}>
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
};

export default KanbanColumn;
