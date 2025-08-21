import React, { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { GRID_SIZE, CARD_WIDTH, CARD_HEIGHT } from "./constants";

function DraggableItem({ id, children, position, disabled = false, isUpdating = false }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    disabled,
    data: { position }
  });

  const style = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    width: CARD_WIDTH,
    minHeight: CARD_HEIGHT,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.8 : isUpdating ? 0.6 : 1,
    zIndex: isDragging ? 1000 : 1,
    transition: isUpdating ? 'opacity 0.2s ease' : 'none'
  };

  const dragProps = disabled ? {} : { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style} {...dragProps}>
      {children}
    </div>
  );
}

function DroppableGrid({ children, containerRef, containerSize }) {
  const { setNodeRef } = useDroppable({
    id: 'droppable-grid'
  });

  return (
    <div 
      ref={(node) => {
        setNodeRef(node);
        if (containerRef) containerRef.current = node;
      }}
      style={{
        position: 'relative',
        width: '100%',
        height: `${containerSize.height}px`,
        minHeight: '600px',
        background: `
          linear-gradient(90deg, color-mix(in oklab, var(--text) 5%, transparent) 1px, transparent 1px),
          linear-gradient(color-mix(in oklab, var(--text) 5%, transparent) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
        borderRadius: 'var(--radius)',
        border: '1px solid color-mix(in oklab, var(--text) 10%, transparent)',
        overflow: 'visible' // Allow content to expand beyond initial bounds
      }}
    >
      {children}
    </div>
  );
}

export default function DraggableGrid({ 
  items, 
  renderItem, 
  disabled = false,
  onItemsChange // Callback to update items with new positions
}) {
  // Calculate dynamic container size based on item positions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 600 });
  const [updatingItems, setUpdatingItems] = useState(new Set());

  // Extract positions from items
  const positions = React.useMemo(() => {
    const pos = {};
    items.forEach(item => {
      if (item.position) {
        pos[item.id] = item.position;
      }
    });
    return pos;
  }, [items]);

  const containerRef = React.useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { 
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor)
  );

  const snapToGrid = useCallback((value) => {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, []);

  // Calculate required container size based on item positions
  const calculateContainerSize = useCallback((itemPositions) => {
    if (Object.keys(itemPositions).length === 0) {
      return { width: 800, height: 600 }; // Default minimum size
    }

    let maxX = 0;
    let maxY = 0;

    Object.values(itemPositions).forEach(pos => {
      maxX = Math.max(maxX, pos.x + CARD_WIDTH);
      maxY = Math.max(maxY, pos.y + CARD_HEIGHT);
    });

    // Add padding around the edges
    const padding = GRID_SIZE * 4;
    return {
      width: Math.max(800, maxX + padding), // Minimum 800px width
      height: Math.max(600, maxY + padding) // Minimum 600px height
    };
  }, []);

  // Update container size whenever positions change
  React.useEffect(() => {
    const newSize = calculateContainerSize(positions);
    setContainerSize(newSize);
  }, [positions, calculateContainerSize]);

  const handleDragEnd = useCallback(async (event) => {
    if (disabled || !onItemsChange) return;
    
    const { active, delta } = event;
    
    if (!delta) return;

    const currentPosition = positions[active.id] || { x: 0, y: 0 };
    const newPosition = {
      x: Math.max(0, snapToGrid(currentPosition.x + delta.x)),
      y: Math.max(0, snapToGrid(currentPosition.y + delta.y))
    };

    // Immediately update local state to show item in new position with transparency
    const updatedItems = items.map(item => 
      item.id === active.id 
        ? { ...item, position: newPosition }
        : item
    );
    
    // Mark item as updating (will show with reduced opacity)
    setUpdatingItems(prev => new Set([...prev, active.id]));
    
    try {
      // Call the async update function
      await onItemsChange(updatedItems);
    } finally {
      // Remove updating state when save completes (success or failure)
      setUpdatingItems(prev => {
        const next = new Set(prev);
        next.delete(active.id);
        return next;
      });
    }
  }, [positions, snapToGrid, disabled, onItemsChange, items]);

  const handleDragStart = useCallback(() => {
    // Optional: Add any drag start logic here
  }, []);


  // Clean up any old localStorage position data on first load
  React.useEffect(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('fizzrix.dashboard.positions.')) {
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Assign positions to items that don't have them
  React.useEffect(() => {
    if (!onItemsChange) return;

    const itemsNeedingPositions = items.filter(item => !item.position);
    if (itemsNeedingPositions.length === 0) return;

    const existingPositions = items
      .filter(item => item.position)
      .map(item => item.position);
    
    const updatedItems = items.map((item) => {
      if (item.position) return item;

      // Find next available grid position
      let gridIndex = existingPositions.length;
      let position;
      let attempts = 0;
      
      do {
        const col = gridIndex % 4;
        const row = Math.floor(gridIndex / 4);
        position = {
          x: col * (CARD_WIDTH + GRID_SIZE * 2),
          y: row * (CARD_HEIGHT + GRID_SIZE * 2)
        };
        
        const isOccupied = existingPositions.some(pos => 
          Math.abs(pos.x - position.x) < CARD_WIDTH && 
          Math.abs(pos.y - position.y) < CARD_HEIGHT
        );
        
        if (!isOccupied) {
          existingPositions.push(position);
          break;
        }
        gridIndex++;
        attempts++;
      } while (attempts < 100);
      
      return { ...item, position };
    });

    onItemsChange(updatedItems);
  }, [items, onItemsChange]);

  const modifiers = disabled ? [] : [snapCenterToCursor];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={modifiers}
    >
      <DroppableGrid containerRef={containerRef} containerSize={containerSize}>
        {items.map((item) => (
          <DraggableItem
            key={item.id}
            id={item.id}
            position={item.position || { x: 0, y: 0 }}
            disabled={disabled}
            isUpdating={updatingItems.has(item.id)}
          >
            {renderItem(item)}
          </DraggableItem>
        ))}
      </DroppableGrid>
    </DndContext>
  );
}

