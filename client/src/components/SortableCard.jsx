// src/components/SortableCard.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TaskCard from './TaskCard'; // Import TaskCard

export function SortableCard({ card, listId, members, onEditClick }) {
  const {
    attributes,
    listeners, // Đây là object chứa { onPointerDown, ... }
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: card.id,
    data: { 
      listId: listId,
      type: 'card'
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1, // Ẩn item gốc khi kéo
  };

  // --- (SỬA LỖI 1) Lưu listener gốc ---
  // Tách hàm onPointerDown gốc từ dnd-kit ra
  const { onPointerDown: dndKitPointerDown, ...otherListeners } = listeners || {};

  // --- (SỬA LỖI 2) Tạo hàm bọc (wrap) ---
  const handlePointerDown = (e) => {
    // 1. Ngăn sự kiện này nổi bọt lên Cột (List)
    e.stopPropagation();
    
    // 2. Gọi hàm onPointerDown gốc của dnd-kit (nếu nó tồn tại)
    if (dndKitPointerDown) {
      dndKitPointerDown(e);
    }
  };
  // --- (KẾT THÚC SỬA LỖI 2) ---

  return (
    <TaskCard
      ref={setNodeRef}
      style={style}
      {...attributes}
      // --- (SỬA LỖI 3) Áp dụng các listener còn lại và hàm bọc mới ---
      {...otherListeners}
      onPointerDown={handlePointerDown} 
      // --- (KẾT THÚC SỬA LỖI 3) ---
      task={card}
      members={members}
      onEditClick={onEditClick}
    />
  );
}