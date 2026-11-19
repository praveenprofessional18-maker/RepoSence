import { useMemo } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

function SortableSection({ section, checked, onToggle }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 };
  return <div ref={setNodeRef} style={style} className="doc-section-row">
    <button type="button" className="doc-drag-handle" aria-label={`Reorder ${section.label}`} {...attributes} {...listeners}><GripVertical size={13}/></button>
    <label><input type="checkbox" checked={checked} onChange={(event) => onToggle(section.id, event.target.checked)}/><span>{section.label}</span></label>
  </div>;
}

export default function SectionToggleList({ sections, order, enabled, onToggle, onReorder }) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const orderedSections = useMemo(() => {
    const lookup = new Map(sections.map((section) => [section.id, section]));
    return order.map((id) => lookup.get(id)).filter(Boolean);
  }, [sections, order]);
  const onDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const from = order.indexOf(active.id);
    const to = order.indexOf(over.id);
    if (from >= 0 && to >= 0) onReorder(arrayMove(order, from, to));
  };

  return <section className="doc-sections-panel" aria-label="Document sections">
    <h3>Sections</h3>
    <p>Drag to reorder; uncheck sections to omit them.</p>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={orderedSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
        {orderedSections.map((section) => <SortableSection key={section.id} section={section} checked={Boolean(enabled[section.id])} onToggle={onToggle}/>)}
      </SortableContext>
    </DndContext>
  </section>;
}
