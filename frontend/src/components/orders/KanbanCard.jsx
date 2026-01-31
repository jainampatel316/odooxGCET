import { formatCurrency } from '../../utils/helpers';
import { Tag, User, Calendar, CheckSquare, CalendarClock, CalendarDays, CalendarRange } from 'lucide-react';

const KanbanCard = ({ order, onClick, colorTheme, isDragging }) => {
    // Get tag style based on rental duration / status
    const getTagStyle = (duration) => {
        const styles = {
            'quotation': 'text-purple-600 bg-purple-50 border-purple-100',
            'sold-order': 'text-orange-600 bg-orange-50 border-orange-100',
            'confirmed': 'text-green-600 bg-green-50 border-green-100',
            'invoiced': 'text-blue-600 bg-blue-50 border-blue-100',
            'cancelled': 'text-red-600 bg-red-50 border-red-100'
        };
        return styles[duration] || 'text-gray-600 bg-gray-50 border-gray-100';
    };

    const tagStyle = getTagStyle(order.rentalDuration);

    return (
        <div
            onClick={() => onClick(order)}
            className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative hover:-translate-y-0.5 ${isDragging ? 'shadow-2xl ring-2 ring-blue-400 rotate-2 scale-105' : ''
                }`}
        >
            {/* Selection/Status Indicator on left edge (optional, usually fits this style) */}

            {/* Header: Title and Avatar */}
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-gray-800 text-sm leading-tight pr-2">
                    {order.product} - {order.customerName}
                </h4>
                <div className="w-6 h-6 rounded-full bg-gray-100 border border-white shadow-sm flex items-center justify-center text-[10px] font-bold text-gray-500 overflow-hidden shrink-0">
                    {/* Fallback avatar */}
                    {order.customerName.charAt(0)}
                </div>
            </div>

            {/* ID and Date */}
            <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                    <span className="font-mono">{order.orderReference}</span>
                </span>
            </div>

            {/* Tags Row */}
            <div className="flex items-center flex-wrap gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border flex items-center gap-1 ${tagStyle}`}>
                    <Tag className="w-3 h-3" />
                    {order.rentalDuration}
                </span>

                {/* Rental Period Badge */}
                {order.rentalPeriodType && (() => {
                    const RentalIcon = order.rentalPeriodType === 'hourly' ? CalendarClock : order.rentalPeriodType === 'daily' ? CalendarDays : CalendarRange;
                    return (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-blue-100 bg-blue-50 text-blue-600 flex items-center gap-1">
                            <RentalIcon className="w-3 h-3" />
                            {order.rentalPeriodDuration} {order.rentalPeriodType === 'hourly' ? 'hr' : order.rentalPeriodType === 'daily' ? 'day' : 'wk'}{order.rentalPeriodDuration > 1 ? 's' : ''}
                        </span>
                    );
                })()}

                <span className="text-gray-400 text-[10px] flex items-center gap-1 pl-1">
                    <CheckSquare className="w-3 h-3" />
                    {/* Mock checklist count */}
                    2/5
                </span>
            </div>

            {/* Footer: Price and Date */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.orderDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
                <span className="text-sm font-bold text-gray-700">
                    {formatCurrency(order.total)}
                </span>
            </div>
        </div>
    );
};

export default KanbanCard;
