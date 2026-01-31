import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';

const OrdersKanbanView = ({ orders, onOrderClick, onOrderDrop }) => {
    // Group orders by status: draft → confirmed → active → returned → completed; cancelled separate
    const groupedOrders = {
        draft: orders.filter(o => o.status === 'draft'),
        confirmed: orders.filter(o => o.status === 'confirmed'),
        active: orders.filter(o => o.status === 'active' || o.status === 'picked_up'),
        returned: orders.filter(o => o.status === 'returned'),
        completed: orders.filter(o => o.status === 'completed'),
        cancelled: orders.filter(o => o.status === 'cancelled'),
    };

    const columns = [
        { key: 'draft', title: 'Draft', orders: groupedOrders.draft },
        { key: 'confirmed', title: 'Confirmed', orders: groupedOrders.confirmed },
        { key: 'active', title: 'Active', orders: groupedOrders.active },
        { key: 'returned', title: 'Returned', orders: groupedOrders.returned },
        { key: 'completed', title: 'Completed', orders: groupedOrders.completed },
        { key: 'cancelled', title: 'Cancelled', orders: groupedOrders.cancelled },
    ];

    const validTransitions = {
        draft: ['confirmed', 'cancelled'],
        confirmed: ['cancelled'],
        active: [],
        returned: [],
        completed: [],
        cancelled: [],
    };

    const handleDragEnd = (result) => {
        const { source, destination, draggableId } = result;

        // Dropped outside a valid droppable
        if (!destination) {
            return;
        }

        // Dropped in the same position
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        const sourceStatus = source.droppableId;
        const destStatus = destination.droppableId;

        // Check if transition is valid
        if (!validTransitions[sourceStatus]?.includes(destStatus)) {
            // Invalid transition - show feedback or just ignore
            console.warn(`Invalid transition from ${sourceStatus} to ${destStatus}`);
            return;
        }

        // Call the parent handler with the order ID and new status
        if (onOrderDrop) {
            onOrderDrop(draggableId, destStatus);
        }
    };

    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex h-[calc(100vh-220px)] overflow-x-auto overflow-y-hidden pb-4 gap-6 px-2">
                {columns.map((column) => (
                    <Droppable key={column.key} droppableId={column.key}>
                        {(provided, snapshot) => (
                            <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className="flex-shrink-0"
                            >
                                <KanbanColumn
                                    title={column.title}
                                    orders={column.orders}
                                    count={column.orders.length}
                                    onClick={onOrderClick}
                                    status={column.key}
                                    isDraggingOver={snapshot.isDraggingOver}
                                />
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                ))}
            </div>
        </DragDropContext>
    );
};

export default OrdersKanbanView;
