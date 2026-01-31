import { DragDropContext, Droppable } from 'react-beautiful-dnd';
import KanbanColumn from './KanbanColumn';
import { orderStatuses } from '../../data/mockData';

const OrdersKanbanView = ({ orders, onOrderClick, onOrderDrop }) => {
    // Group orders by status
    const groupedOrders = {
        quotation: orders.filter(o => o.status === orderStatuses.QUOTATION),
        sale_order: orders.filter(o => o.status === orderStatuses.SALE_ORDER),
        confirmed: orders.filter(o => o.status === orderStatuses.CONFIRMED),
        invoiced: orders.filter(o => o.status === orderStatuses.INVOICED),
        cancelled: orders.filter(o => o.status === orderStatuses.CANCELLED),
    };

    // Define the columns to show in order
    const columns = [
        { key: 'quotation', title: 'Quotation', orders: groupedOrders.quotation },
        { key: 'sale_order', title: 'Sale order', orders: groupedOrders.sale_order },
        { key: 'confirmed', title: 'Confirmed', orders: groupedOrders.confirmed },
        { key: 'invoiced', title: 'Invoiced', orders: groupedOrders.invoiced },
        { key: 'cancelled', title: 'Cancelled', orders: groupedOrders.cancelled },
    ];

    // Valid transitions in the rental lifecycle
    const validTransitions = {
        quotation: ['sale_order', 'cancelled'],
        sale_order: ['confirmed', 'cancelled'],
        confirmed: ['invoiced', 'cancelled'],
        invoiced: ['cancelled'], // Invoiced can only be cancelled
        cancelled: [], // Cancelled is terminal
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
