import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    id: string;
    children: React.ReactNode;
    disabled?: boolean;
}

export const SortableRow: React.FC<SortableRowProps> = ({ id, children, disabled, className, ...props }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : 'grab',
        position: 'relative' as const,
        zIndex: isDragging ? 999 : 1,
        boxShadow: isDragging ? '0px 5px 15px rgba(0,0,0,0.2)' : 'none',
        backgroundColor: isDragging ? 'var(--bg-card-hover)' : undefined, // feedback while dragging
    };

    return (
        <tr
            ref={setNodeRef}
            style={style}
            className={className}
            {...attributes}
            {...listeners}
            {...props}
        >
            {children}
        </tr>
    );
};
