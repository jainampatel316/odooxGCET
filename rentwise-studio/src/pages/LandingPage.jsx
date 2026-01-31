import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Laptop, Music, Bike, PartyPopper, Wrench, Star, Shield, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../utils/storage';
import { useEffect, useState } from 'react';

const LandingPage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    const products = getProducts();
    setFeaturedProducts(products.filter(p => p.isPublished).slice(0, 4));
  }, []);

  const categories = [
    { name: 'Cameras', icon: Camera, count: 45, color: 'bg-blue-500/10 text-blue-600' },
    { name: 'Electronics', icon: Laptop, count: 32, color: 'bg-purple-500/10 text-purple-600' },
    { name: 'Audio', icon: Music, count: 28, color: 'bg-pink-500/10 text-pink-600' },
    { name: 'Outdoor', icon: Bike, count: 56, color: 'bg-green-500/10 text-green-600' },
    { name: 'Party & Events', icon: PartyPopper, count: 41, color: 'bg-amber-500/10 text-amber-600' },
    { name: 'Tools', icon: Wrench, count: 23, color: 'bg-slate-500/10 text-slate-600' },
  ];

  const features = [
    {
      icon: Shield,
      title: 'Verified Equipment',
      description: 'All products are inspected and verified for quality before each rental.',
    },
    {
      icon: Clock,
      title: 'Flexible Rentals',
      description: 'Rent by the hour, day, or week. Cancel anytime with our flexible policy.',
    },
    {
      icon: Star,
      title: 'Trusted Vendors',
      description: 'Work with verified vendors rated by thousands of happy customers.',
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Mitchell',
      role: 'Professional Photographer',
      content: 'RentFlow saved my wedding shoot! I needed a backup camera last minute and had it delivered within hours.',
      rating: 5,
    },
    {
      name: 'James Chen',
      role: 'Event Organizer',
      content: 'The PA system was perfect for our corporate event. Great quality equipment at a fraction of the purchase price.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Content Creator',
      content: 'I rent drones regularly for my YouTube videos. The process is seamless and the equipment is always top-notch.',
      rating: 5,
    },
  ];

  return (
    <CustomerLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 bg-[url('/placeholder.svg')] opacity-5" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Rent Premium Equipment
              <span className="block text-accent">Without the Premium Price</span>
            </h1>
            <p className="text-lg md:text-xl mb-8 text-primary-foreground/80 max-w-2xl">
              Access thousands of professional-grade cameras, audio equipment, tools, and more. 
              Rent by the hour, day, or week with flexible terms and instant availability.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/products">
                <Button size="lg" variant="secondary" className="gap-2 text-foreground">
                  Browse Equipment
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/vendor/register">
                <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Become a Vendor
                </Button>
              </Link>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-primary-foreground/20">
              <div>
                <div className="text-3xl md:text-4xl font-bold">10K+</div>
                <div className="text-primary-foreground/70 text-sm">Products</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">50K+</div>
                <div className="text-primary-foreground/70 text-sm">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold">500+</div>
                <div className="text-primary-foreground/70 text-sm">Trusted Vendors</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Browse by Category</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find exactly what you need from our wide range of rental categories
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                to={`/products?category=${category.name.toLowerCase()}`}
                className="card-interactive p-6 text-center hover:shadow-lg transition-all"
              >
                <div className={`inline-flex p-4 rounded-full mb-4 ${category.color}`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-1">{category.name}</h3>
                <p className="text-sm text-muted-foreground">{category.count} items</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2">Featured Equipment</h2>
              <p className="text-muted-foreground">Top-rated products available for rent</p>
            </div>
            <Link to="/products">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Renting equipment has never been easier. Follow these simple steps.
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: 'Browse', description: 'Explore our catalog of 10,000+ products' },
              { step: 2, title: 'Book', description: 'Select dates and add items to your cart' },
              { step: 3, title: 'Pickup', description: 'Collect your equipment or get it delivered' },
              { step: 4, title: 'Return', description: 'Return on time and rate your experience' },
            ].map((item) => (
              <div key={item.step} className="text-center relative">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold mb-4">
                  {item.step}
                </div>
                {item.step < 4 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-muted-foreground/30" />
                )}
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="card-elevated p-8">
                <div className="inline-flex p-3 rounded-lg bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What Our Customers Say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust RentFlow for their equipment needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-card rounded-xl p-6 shadow-sm border">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonial.rating }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-foreground mb-4">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join thousands of customers who rent smarter with RentFlow. 
            Create your free account today and start renting.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/signup">
              <Button size="lg" variant="secondary" className="text-foreground">
                Create Free Account
              </Button>
            </Link>
            <Link to="/products">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                Browse Products
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
};

export default LandingPage;
