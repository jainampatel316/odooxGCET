import { MoreHorizontal, Plus, Info } from 'lucide-react';
import { Draggable } from 'react-beautiful-dnd';
import KanbanCard from './KanbanCard';

const KanbanColumn = ({ title, orders, count, onClick, status, isDraggingOver }) => {
    // Define column specific styles based on status or index
    const getColumnStyles = (title) => {
        const styles = {
            'Total': { color: 'bg-indigo-600', border: 'border-indigo-600', icon: 'bg-indigo-700' },
            'Sale order': { color: 'bg-cyan-500', border: 'border-cyan-500', icon: 'bg-cyan-600' },
            'Quotation': { color: 'bg-purple-600', border: 'border-purple-600', icon: 'bg-purple-700' },
            'Confirmed': { color: 'bg-orange-500', border: 'border-orange-500', icon: 'bg-orange-600' },
            'Invoiced': { color: 'bg-green-500', border: 'border-green-500', icon: 'bg-green-600' },
            'Cancelled': { color: 'bg-red-500', border: 'border-red-500', icon: 'bg-red-600' },
        };
        return styles[title] || styles['Total'];
    };

    const style = getColumnStyles(title);

    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full max-h-full">
            {/* Colorful Header */}
            <div className={`${style.color} text-white p-3 rounded-t-lg flex items-center justify-between shadow-sm`}>
                <div className="flex items-center gap-2">
                    {/* Status Icon Placeholder */}
                    <div className="p-1 rounded bg-white/20">
                        <Info className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-semibold text-sm tracking-wide">{title}</h3>
                </div>
                <div className="flex items-center gap-1">
                </div>
            </div>

            {/* Column Body */}
            <div
                className={`bg-gray-100/50 border-x border-b border-gray-200 rounded-b-lg p-3 flex-1 overflow-y-auto min-h-[500px] transition-colors ${isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                    }`}
            >
                {/* Statistics / Sub-header bar */}
                <div className="bg-white p-2 rounded mb-3 flex items-center justify-between shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                        <span className="flex items-center gap-1"><span className="w-4 h-4 flex items-center justify-center border border-gray-300 rounded text-[10px]">{count}</span> Items</span>
                    </div>

                </div>

                {/* Cards Stack */}
                <div className="space-y-3">
                    {orders.map((order, index) => (
                        <Draggable key={order.id} draggableId={order.id} index={index}>
                            {(provided, snapshot) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    style={{
                                        ...provided.draggableProps.style,
                                        opacity: snapshot.isDragging ? 0.8 : 1,
                                    }}
                                >
                                    <KanbanCard
                                        order={order}
                                        onClick={onClick}
                                        colorTheme={style.color}
                                        isDragging={snapshot.isDragging}
                                    />
                                </div>
                            )}
                        </Draggable>
                    ))}

                    {orders.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                            <span className="text-sm">No items</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default KanbanColumn;
