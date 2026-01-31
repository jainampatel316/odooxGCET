import { Link } from 'react-router-dom';
import { Star, Clock, ShoppingCart } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/helpers';
import { Button } from './ui/button';
import { toast } from '@/hooks/use-toast';

const ProductCard = ({ product }) => {
  const { addToCart } = useApp();

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  return (
    <Link 
      to={`/products/${product.id}`}
      className="group card-interactive p-0 overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        <img
          src={product.images?.[0] || '/placeholder.svg'}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {product.availableQuantity === 0 && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="badge-overdue px-3 py-1 rounded-full text-sm font-medium">
              Out of Stock
            </span>
          </div>
        )}
        {product.availableQuantity > 0 && product.availableQuantity <= 2 && (
          <div className="absolute top-2 left-2">
            <span className="badge-pending px-2 py-1 rounded text-xs font-medium">
              Only {product.availableQuantity} left
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Category & Rating */}
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">
            {product.attributes?.brand || 'Brand'}
          </span>
          {product.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{product.rating}</span>
              <span className="text-muted-foreground">({product.reviewCount})</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-2">
          {product.name}
        </h3>

        {/* Pricing */}
        <div className="mt-auto space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(product.pricePerDay)}
            </span>
            <span className="text-muted-foreground text-sm">/day</span>
          </div>

          {/* Hourly rate if available */}
          {product.pricePerHour > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>{formatCurrency(product.pricePerHour)}/hour</span>
            </div>
          )}

          {/* Add to Cart Button */}
          <Button 
            onClick={handleAddToCart}
            className="w-full gap-2"
            disabled={product.availableQuantity === 0}
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
