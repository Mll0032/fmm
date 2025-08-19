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

function DraggableItem({ id, children, position, disabled = false }) {
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
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : 1,
    transition: isDragging ? 'none' : 'transform 0.2s ease'
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
  sessionId // Add sessionId prop for persistence
}) {
  const getStorageKey = useCallback((sessionId) => `fizzrix.dashboard.positions.${sessionId}`, []);

  // Calculate dynamic container size based on item positions
  const [containerSize, setContainerSize] = useState({ width: 0, height: 600 });

  const [positions, setPositions] = useState({});
  const [positionsLoaded, setPositionsLoaded] = useState(false);

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

  const savePositions = useCallback((newPositions) => {
    if (sessionId) {
      try {
        localStorage.setItem(getStorageKey(sessionId), JSON.stringify(newPositions));
      } catch (error) {
        console.warn('Failed to save positions:', error);
      }
    }
  }, [sessionId, getStorageKey]);

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

  const handleDragEnd = useCallback((event) => {
    if (disabled) return;
    
    const { active, delta } = event;
    
    if (!delta) return;

    const currentPosition = positions[active.id] || { x: 0, y: 0 };
    const newPosition = {
      x: Math.max(0, snapToGrid(currentPosition.x + delta.x)),
      y: Math.max(0, snapToGrid(currentPosition.y + delta.y))
    };

    // Allow expansion - only enforce minimum bounds (no maximum bounds)
    // This lets users drag items beyond current container size to expand it
    newPosition.x = Math.max(0, newPosition.x);
    newPosition.y = Math.max(0, newPosition.y);

    const updatedPositions = {
      ...positions,
      [active.id]: newPosition
    };
    // Position saved to localStorage
    setPositions(updatedPositions);
    savePositions(updatedPositions);
  }, [positions, snapToGrid, disabled, savePositions, sessionId]);

  const handleDragStart = useCallback(() => {
    // Optional: Add any drag start logic here
  }, []);


  // Initialize positions only when sessionId changes - much simpler approach
  React.useEffect(() => {
    if (!sessionId) {
      setPositions({});
      setPositionsLoaded(true);
      return;
    }

    // Mark as loading to prevent visual glitch
    setPositionsLoaded(false);

    // Load saved positions for this session
    let savedPositions = {};
    try {
      const saved = localStorage.getItem(getStorageKey(sessionId));
      if (saved) {
        savedPositions = JSON.parse(saved);
        // Positions loaded successfully
      } else {
        // No saved positions for this session
      }
    } catch (error) {
      console.warn('Failed to load positions for session:', sessionId, error);
    }

    setPositions(savedPositions);
    setPositionsLoaded(true);
  }, [sessionId, getStorageKey]);

  // Handle items changes (add positions for new items)
  React.useEffect(() => {
    if (!sessionId || items.length === 0) {
      return;
    }

    // Check if any items need positions
    const itemsNeedingPositions = items.filter(item => !positions[item.id]);
    if (itemsNeedingPositions.length === 0) {
      return;
    }

    // Add positions for items that don't have them
    const newPositions = { ...positions };
    const existingPositions = Object.values(positions);
    
    itemsNeedingPositions.forEach((item, index) => {
      // Find next available grid position
      let gridIndex = existingPositions.length + index;
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
        
        if (!isOccupied) break;
        gridIndex++;
        attempts++;
      } while (attempts < 100); // Safety valve
      
      newPositions[item.id] = position;
      existingPositions.push(position);
    });

    setPositions(newPositions);
    savePositions(newPositions);
  }, [items, positions, sessionId, savePositions]);

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
        {positionsLoaded && items.map((item) => (
          <DraggableItem
            key={item.id}
            id={item.id}
            position={positions[item.id] || { x: 0, y: 0 }}
            disabled={disabled}
          >
            {renderItem(item)}
          </DraggableItem>
        ))}
      </DroppableGrid>
    </DndContext>
  );
}

