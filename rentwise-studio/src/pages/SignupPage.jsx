import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Check } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { addUser } from '../utils/storage';
import { generateId } from '../data/mockData';
import { toast } from '@/hooks/use-toast';

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    gstin: '',
    password: '',
    confirmPassword: '',
    couponCode: '',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email address';
    if (!formData.gstin.trim()) newErrors.gstin = 'GSTIN is required for invoicing';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      const newUser = {
        id: generateId(),
        name: formData.name,
        email: formData.email,
        companyName: formData.companyName,
        gstin: formData.gstin,
        role: 'customer',
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      };

      login(newUser);
      
      toast({
        title: "Account created!",
        description: "Welcome to RentFlow. Start exploring equipment to rent.",
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    'Access to 10,000+ products',
    'Flexible rental periods',
    'Secure payments',
    'Easy returns',
  ];

  return (
    <CustomerLayout>
      <div className="container py-16">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column - Form */}
            <div>
              <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
              <p className="text-muted-foreground mb-8">
                Join thousands of customers renting equipment smarter
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.name ? 'border-destructive' : ''}`}
                    placeholder="John Smith"
                  />
                  {errors.name && <p className="text-destructive text-sm mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.email ? 'border-destructive' : ''}`}
                    placeholder="you@example.com"
                  />
                  {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Company Name</label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="Your Company Ltd."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">GSTIN *</label>
                  <input
                    type="text"
                    name="gstin"
                    value={formData.gstin}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.gstin ? 'border-destructive' : ''}`}
                    placeholder="22AAAAA0000A1Z5"
                  />
                  {errors.gstin && <p className="text-destructive text-sm mt-1">{errors.gstin}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Required for GST invoicing</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Password *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10 ${errors.password ? 'border-destructive' : ''}`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.confirmPassword ? 'border-destructive' : ''}`}
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Coupon Code (Optional)</label>
                  <input
                    type="text"
                    name="couponCode"
                    value={formData.couponCode}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    placeholder="WELCOME10"
                  />
                </div>

                <label className={`flex items-start gap-2 cursor-pointer ${errors.agreeToTerms ? 'text-destructive' : ''}`}>
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    checked={formData.agreeToTerms}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary mt-1"
                  />
                  <span className="text-sm">
                    I agree to the{' '}
                    <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                  </span>
                </label>
                {errors.agreeToTerms && <p className="text-destructive text-sm">{errors.agreeToTerms}</p>}

                <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <p className="text-center mt-6 text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Right Column - Features */}
            <div className="hidden lg:block">
              <div className="bg-primary/5 rounded-2xl p-8 h-full">
                <h2 className="text-2xl font-bold mb-6">Why Join RentFlow?</h2>
                
                <div className="space-y-4 mb-8">
                  {features.map((feature) => (
                    <div key={feature} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-card rounded-xl p-6 border">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src="/placeholder.svg"
                      alt="Customer"
                      className="w-12 h-12 rounded-full bg-muted"
                    />
                    <div>
                      <div className="font-semibold">Sarah Mitchell</div>
                      <div className="text-sm text-muted-foreground">Professional Photographer</div>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">
                    "RentFlow has been a game-changer for my business. I can rent high-end gear for shoots without the huge upfront investment."
                  </p>
                </div>

                <div className="mt-8 text-center">
                  <div className="text-4xl font-bold text-primary mb-2">50,000+</div>
                  <div className="text-muted-foreground">Happy customers and counting</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default SignupPage;
