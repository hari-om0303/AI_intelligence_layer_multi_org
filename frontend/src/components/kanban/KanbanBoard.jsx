import React, { useState } from 'react';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import KanbanColumn from './KanbanColumn';
import ProjectCard from './ProjectCard';
import { useAuth } from '../../context/AuthContext';

const COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'DONE', title: 'Done' },
];

const KanbanBoard = ({ projects, setProjects, updateProjectStatus, onEdit, onDelete }) => {
  const [activeProject, setActiveProject] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === 'ORG_ADMIN';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    const { active } = event;
    const project = projects.find((p) => p._id === active.id);
    setActiveProject(project);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeIndex = projects.findIndex((p) => p._id === activeId);
    const overIndex = projects.findIndex((p) => p._id === overId);
    
    const activeProject = projects[activeIndex];
    const overProject = projects[overIndex];
    
    let overColumnId = overId;
    if (overProject) {
        overColumnId = overProject.status || 'TODO';
    }

    if (activeProject.status !== overColumnId) {
      setProjects((prev) => {
        const newProjects = [...prev];
        const aIndex = newProjects.findIndex(p => p._id === activeId);
        newProjects[aIndex].status = overColumnId;
        return newProjects;
      });
    }
  };

  const handleDragEnd = (event) => {
    setActiveProject(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeIndex = projects.findIndex((p) => p._id === activeId);
    const overIndex = projects.findIndex((p) => p._id === overId);
    
    let overColumnId = overId;
    if (overIndex !== -1) {
        overColumnId = projects[overIndex].status || 'TODO';
    }

    const currentProject = projects[activeIndex];

    if (currentProject) {
      if (activeIndex !== overIndex) {
         setProjects((prev) => {
             const items = [...prev];
             return arrayMove(items, activeIndex, overIndex !== -1 ? overIndex : activeIndex);
         });
      }

      if (currentProject.status === overColumnId) {
         updateProjectStatus(currentProject._id, overColumnId);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={isAdmin ? handleDragStart : undefined}
      onDragOver={isAdmin ? handleDragOver : undefined}
      onDragEnd={isAdmin ? handleDragEnd : undefined}
    >
      <div className="flex gap-6 overflow-x-auto pb-4 pt-2">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            projects={projects.filter((p) => (p.status || 'TODO') === col.id)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      
      <DragOverlay>
        {activeProject ? (
          <ProjectCard project={activeProject} onEdit={onEdit} onDelete={onDelete} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
