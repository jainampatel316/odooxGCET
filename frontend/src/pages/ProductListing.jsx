import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Grid, List, ChevronDown, X, SlidersHorizontal } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';
import { productAPI } from '../utils/api';
import { mapBackendProductsToFrontend } from '../utils/productMapper';
import { formatCurrency } from '../utils/helpers';
import { toast } from '@/hooks/use-toast';

const ProductListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  
  // Filter states - aligned with backend
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedVendor, setSelectedVendor] = useState(searchParams.get('vendorId') || '');
  const [rentalPriceRange, setRentalPriceRange] = useState([0, 1000]);
  const [salesPriceRange, setSalesPriceRange] = useState([0, 10000]);
  const [rentalPeriodType, setRentalPeriodType] = useState(searchParams.get('rentalPeriodType') || 'DAILY');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedAttributes, setSelectedAttributes] = useState({});
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [isRentable, setIsRentable] = useState(true);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 20;
  
  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState({
    tags: [],
    vendors: [],
    attributes: [],
    rentalPeriodTypes: ['HOURLY', 'DAILY', 'WEEKLY'], // Default values so filters show immediately
    rentalPriceRange: { min: 0, max: 1000 },
    priceRange: { min: 0, max: 10000 },
  });

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const response = await productAPI.getFilterOptions();
        if (response.success && response.data) {
          setFilterOptions({
            tags: response.data.tags || [],
            vendors: response.data.vendors || [],
            attributes: response.data.attributes || [],
            rentalPeriodTypes: response.data.rentalPeriodTypes || ['HOURLY', 'DAILY', 'WEEKLY'],
            rentalPriceRange: response.data.rentalPriceRange || { min: 0, max: 1000 },
            priceRange: response.data.priceRange || { min: 0, max: 10000 },
          });
          // Update price ranges based on backend data
          if (response.data.rentalPriceRange) {
            setRentalPriceRange([
              response.data.rentalPriceRange.min || 0,
              response.data.rentalPriceRange.max || 1000
            ]);
          }
          if (response.data.priceRange) {
            setSalesPriceRange([
              response.data.priceRange.min || 0,
              response.data.priceRange.max || 10000
            ]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch filter options:', error);
        // Provide default filter options if backend fails
        // This allows the page to still function even if filter endpoint has issues
        setFilterOptions({
          tags: [],
          vendors: [],
          attributes: [],
          rentalPeriodTypes: ['HOURLY', 'DAILY', 'WEEKLY'],
          rentalPriceRange: { min: 0, max: 1000 },
          priceRange: { min: 0, max: 10000 },
        });
      }
    };
    fetchFilterOptions();
  }, []);

  // Update URL params when filters change (debounced to avoid too many updates)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      if (selectedVendor) params.set('vendorId', selectedVendor);
      if (rentalPeriodType && rentalPeriodType !== 'DAILY') params.set('rentalPeriodType', rentalPeriodType);
      if (sortBy && sortBy !== 'createdAt') params.set('sortBy', sortBy);
      if (sortOrder && sortOrder !== 'desc') params.set('sortOrder', sortOrder);
      if (currentPage > 1) params.set('page', currentPage.toString());
      
      setSearchParams(params, { replace: true });
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedVendor, rentalPeriodType, sortBy, sortOrder, currentPage, setSearchParams]);

  // Fetch products from backend
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      try {
        // Build query params according to backend API specification
        // Supports all filter types: pagination, search, vendor, price ranges, tags, attributes, sorting
        const queryParams = {
          // 1. Pagination
          page: currentPage,
          limit,
          
          // 2. Search
          search: searchQuery || undefined,
          
          // 3. Filter by vendor
          vendorId: selectedVendor || undefined,
          
          // 4. Filter by sales price range
          minPrice: salesPriceRange[0] > (filterOptions.priceRange?.min || 0) ? salesPriceRange[0] : undefined,
          maxPrice: salesPriceRange[1] < (filterOptions.priceRange?.max || 10000) ? salesPriceRange[1] : undefined,
          
          // 5. Filter by rental price
          rentalPeriodType: rentalPeriodType || undefined,
          minRentalPrice: rentalPriceRange[0] > (filterOptions.rentalPriceRange?.min || 0) ? rentalPriceRange[0] : undefined,
          maxRentalPrice: rentalPriceRange[1] < (filterOptions.rentalPriceRange?.max || 1000) ? rentalPriceRange[1] : undefined,
          
          // 6. Filter by tags (comma-separated)
          tags: selectedTags.length > 0 ? selectedTags.join(',') : undefined,
          
          // 7. Filter by attributes (JSON object)
          attributes: Object.keys(selectedAttributes).length > 0 ? selectedAttributes : undefined,
          
          // 8. Sorting
          sortBy: sortBy || 'createdAt',
          sortOrder: sortOrder || 'desc',
          
          // Additional filters
          isRentable: isRentable ? 'true' : undefined,
        };

        // Remove undefined values to keep query string clean
        Object.keys(queryParams).forEach(key => {
          if (queryParams[key] === undefined || queryParams[key] === '') {
            delete queryParams[key];
          }
        });

        const response = await productAPI.getProducts(queryParams);
        
        if (response.success && response.data) {
          const mappedProducts = mapBackendProductsToFrontend(response.data);
          setProducts(mappedProducts);
          
          // Update pagination
          if (response.pagination) {
            setCurrentPage(response.pagination.currentPage || 1);
            setTotalPages(response.pagination.totalPages || 1);
            setTotalCount(response.pagination.totalCount || 0);
          }
        } else {
          setProducts([]);
          toast({
            title: "Error",
            description: "Failed to load products. Please try again.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        setProducts([]);
        toast({
          title: "Error",
          description: error.message || "Failed to load products. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, searchQuery, selectedVendor, rentalPriceRange, salesPriceRange, rentalPeriodType, selectedTags, selectedAttributes, sortBy, sortOrder, isRentable]);

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedVendor('');
    setRentalPriceRange([filterOptions.rentalPriceRange.min || 0, filterOptions.rentalPriceRange.max || 1000]);
    setSalesPriceRange([filterOptions.priceRange.min || 0, filterOptions.priceRange.max || 10000]);
    setRentalPeriodType('DAILY');
    setSelectedTags([]);
    setSelectedAttributes({});
    setSortBy('createdAt');
    setSortOrder('desc');
    setIsRentable(true);
    setCurrentPage(1);
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || selectedVendor || 
    rentalPriceRange[0] > (filterOptions.rentalPriceRange.min || 0) || 
    rentalPriceRange[1] < (filterOptions.rentalPriceRange.max || 1000) ||
    salesPriceRange[0] > (filterOptions.priceRange.min || 0) ||
    salesPriceRange[1] < (filterOptions.priceRange.max || 10000) ||
    selectedTags.length > 0 || 
    Object.keys(selectedAttributes).length > 0 ||
    !isRentable;

  return (
    <CustomerLayout>
      <div className="container py-8">
        {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Browse Equipment</h1>
            <p className="text-muted-foreground">
              Discover {totalCount} products available for rent
            </p>
          </div>

        {/* Search and Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex gap-2">
            {/* Mobile Filter Toggle */}
            <Button
              variant="outline"
              className="lg:hidden gap-2"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  !
                </span>
              )}
            </Button>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="appearance-none pl-4 pr-10 py-2.5 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="name-asc">Name A-Z</option>
                <option value="name-desc">Name Z-A</option>
                <option value="salesPrice-asc">Price: Low to High</option>
                <option value="salesPrice-desc">Price: High to Low</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>

            {/* View Mode */}
            <div className="hidden sm:flex border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 ${viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2.5 ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className={`w-full lg:w-64 shrink-0 ${isFilterOpen ? 'fixed inset-0 z-50 bg-background p-6 overflow-auto' : 'hidden'} lg:block lg:relative lg:p-0 lg:bg-transparent`}>
            <div className="lg:sticky lg:top-24">
              {/* Mobile Filter Header */}
              <div className="flex items-center justify-between mb-6 lg:hidden">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsFilterOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="w-full mb-6 gap-2">
                  <X className="h-4 w-4" />
                  Clear All Filters
                </Button>
              )}

              {/* Rental Period Type */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Rental Period</h3>
                <div className="space-y-2">
                  {(filterOptions.rentalPeriodTypes.length > 0 ? filterOptions.rentalPeriodTypes : ['HOURLY', 'DAILY', 'WEEKLY']).map((period) => (
                    <button
                      key={period}
                      onClick={() => setRentalPeriodType(period)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        rentalPeriodType === period ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      {period === 'HOURLY' ? 'Per Hour' : period === 'DAILY' ? 'Per Day' : period === 'WEEKLY' ? 'Per Week' : period === 'MONTHLY' ? 'Per Month' : period}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rental Price Range */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Rental Price Range</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Min</label>
                      <input
                        type="number"
                        value={rentalPriceRange[0]}
                        onChange={(e) => setRentalPriceRange([Number(e.target.value), rentalPriceRange[1]])}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Max</label>
                      <input
                        type="number"
                        value={rentalPriceRange[1]}
                        onChange={(e) => setRentalPriceRange([rentalPriceRange[0], Number(e.target.value)])}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(rentalPriceRange[0])} - {formatCurrency(rentalPriceRange[1])}
                  </div>
                </div>
              </div>

              {/* Sales Price Range */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Sales Price Range</h3>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Min</label>
                      <input
                        type="number"
                        value={salesPriceRange[0]}
                        onChange={(e) => setSalesPriceRange([Number(e.target.value), salesPriceRange[1]])}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="0"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground">Max</label>
                      <input
                        type="number"
                        value={salesPriceRange[1]}
                        onChange={(e) => setSalesPriceRange([salesPriceRange[0], Number(e.target.value)])}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                        min="0"
                      />
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatCurrency(salesPriceRange[0])} - {formatCurrency(salesPriceRange[1])}
                  </div>
                </div>
              </div>

              {/* Vendors */}
              {filterOptions.vendors.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Vendors</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedVendor('')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                        !selectedVendor ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      All Vendors
                    </button>
                    {filterOptions.vendors.map((vendor) => (
                      <button
                        key={vendor.id}
                        onClick={() => setSelectedVendor(vendor.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          selectedVendor === vendor.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        {vendor.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {filterOptions.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {filterOptions.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (selectedTags.includes(tag)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag));
                          } else {
                            setSelectedTags([...selectedTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Attributes Filter */}
              {filterOptions.attributes.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">Attributes</h3>
                  <div className="space-y-4">
                    {filterOptions.attributes.map((attrCategory) => (
                      <div key={attrCategory.id}>
                        <h4 className="text-sm font-medium mb-2">{attrCategory.name}</h4>
                        <div className="flex flex-wrap gap-2">
                          {attrCategory.values.map((value) => {
                            const isSelected = selectedAttributes[attrCategory.name] === value.value;
                            return (
                              <button
                                key={value.id}
                                onClick={() => {
                                  const newAttributes = { ...selectedAttributes };
                                  if (isSelected) {
                                    delete newAttributes[attrCategory.name];
                                  } else {
                                    newAttributes[attrCategory.name] = value.value;
                                  }
                                  setSelectedAttributes(newAttributes);
                                }}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                  isSelected
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                              >
                                {value.value}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rentable Only */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Availability</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRentable}
                    onChange={(e) => setIsRentable(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <span className="text-sm">Rentable Only</span>
                </label>
              </div>

              {/* Mobile Apply Button */}
              <Button className="w-full lg:hidden" onClick={() => setIsFilterOpen(false)}>
                Apply Filters
              </Button>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-card rounded-lg border overflow-hidden animate-pulse">
                    <div className="aspect-[4/3] bg-muted" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-8 bg-muted rounded w-1/3" />
                      <div className="h-10 bg-muted rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-muted-foreground mb-4">
                  <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No products found</p>
                  <p>Try adjusting your filters or search query</p>
                </div>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <div key={product.id} className="flex gap-4 bg-card rounded-lg border p-4 hover:shadow-md transition-shadow">
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.name}
                      className="w-32 h-24 object-cover rounded-lg bg-muted"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-primary">{formatCurrency(product.pricePerDay)}/day</span>
                        <Button size="sm">Add to Cart</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default ProductListing;
