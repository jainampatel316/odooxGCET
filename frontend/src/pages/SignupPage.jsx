import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { generateId } from '../data/mockData';
import { toast } from '@/hooks/use-toast';

const SignupPage = () => {
  const navigate = useNavigate();
  const { login } = useApp();

  const [userRole, setUserRole] = useState('customer'); // 'customer' or 'vendor'
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    // Vendor-specific fields
    companyName: '',
    productCategory: '',
    gstNumber: '',
    agreeToTerms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const productCategories = [
    'Electronics',
    'Cameras & Photography',
    'Audio Equipment',
    'Outdoor & Sports',
    'Party & Events',
    'Tools & Equipment',
    'Vehicles',
    'Furniture',
  ];

  const handleRoleSwitch = (role) => {
    setUserRole(role);
    // Clear vendor-specific fields when switching to customer
    if (role === 'customer') {
      setFormData(prev => ({
        ...prev,
        companyName: '',
        productCategory: '',
        gstNumber: '',
      }));
    }
    // Clear errors when switching roles
    setErrors({});
  };

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

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 6 || password.length > 12) {
      errors.push('Password must be between 6 and 12 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('At least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('At least one lowercase letter');
    }
    if (!/[@$&_]/.test(password)) {
      errors.push('At least one special character (@, $, &, _)');
    }
    return errors;
  };

  const validate = () => {
    const newErrors = {};

    // Common validations
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.email.includes('@')) newErrors.email = 'Invalid email address';

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0) {
        newErrors.password = passwordErrors[0];
      }
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.agreeToTerms) {
      newErrors.agreeToTerms = 'You must agree to the terms';
    }

    // Vendor-specific validations
    if (userRole === 'vendor') {
      if (!formData.companyName.trim()) newErrors.companyName = 'Company name is required';
      if (!formData.productCategory) newErrors.productCategory = 'Product category is required';
      if (!formData.gstNumber.trim()) newErrors.gstNumber = 'GST number is required';
    }

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
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        role: userRole,
        createdAt: new Date().toISOString(),
      };

      // Add vendor-specific data
      if (userRole === 'vendor') {
        newUser.companyName = formData.companyName;
        newUser.productCategory = formData.productCategory;
        newUser.gstNumber = formData.gstNumber;
      }

      toast({
        title: "Account created successfully!",
        description: `Welcome to RentFlow. Please login to continue.`,
      });

      // Redirect to login page instead of auto-login
      navigate('/login');
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

  return (
    <CustomerLayout>
      <div className="container py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
            <p className="text-muted-foreground">
              Join RentFlow as a {userRole === 'customer' ? 'Customer' : 'Vendor'}
            </p>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleRoleSwitch('customer')}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${userRole === 'customer'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
                }`}
            >
              Customer
            </button>
            <button
              type="button"
              onClick={() => handleRoleSwitch('vendor')}
              className={`py-3 px-4 rounded-lg text-sm font-medium transition-colors ${userRole === 'vendor'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
                }`}
            >
              Vendor
            </button>
          </div>

          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First Name */}
              <div>
                <label className="block text-sm font-medium mb-1">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.firstName ? 'border-destructive' : ''}`}
                  placeholder="John"
                />
                {errors.firstName && <p className="text-destructive text-sm mt-1">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium mb-1">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.lastName ? 'border-destructive' : ''}`}
                  placeholder="Smith"
                />
                {errors.lastName && <p className="text-destructive text-sm mt-1">{errors.lastName}</p>}
              </div>

              {/* Vendor-specific fields */}
              {userRole === 'vendor' && (
                <>
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Company Name *</label>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.companyName ? 'border-destructive' : ''}`}
                      placeholder="Your Company Ltd."
                    />
                    {errors.companyName && <p className="text-destructive text-sm mt-1">{errors.companyName}</p>}
                  </div>

                  {/* Product Category */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Product Category *</label>
                    <select
                      name="productCategory"
                      value={formData.productCategory}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.productCategory ? 'border-destructive' : ''}`}
                    >
                      <option value="">Select a category</option>
                      {productCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    {errors.productCategory && <p className="text-destructive text-sm mt-1">{errors.productCategory}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Required for creating sale orders and invoices
                    </p>
                  </div>

                  {/* GST Number */}
                  <div>
                    <label className="block text-sm font-medium mb-1">GST Number *</label>
                    <input
                      type="text"
                      name="gstNumber"
                      value={formData.gstNumber}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.gstNumber ? 'border-destructive' : ''}`}
                      placeholder="22AAAAA0000A1Z5"
                    />
                    {errors.gstNumber && <p className="text-destructive text-sm mt-1">{errors.gstNumber}</p>}
                  </div>
                </>
              )}

              {/* Email */}
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

              {/* Password */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  6-12 characters with uppercase, lowercase, and special character
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10 ${errors.confirmPassword ? 'border-destructive' : ''}`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-destructive text-sm mt-1">{errors.confirmPassword}</p>}
              </div>

              {/* Terms & Conditions */}
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

              {/* Submit Button */}
              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Register'}
              </Button>
            </form>
          </div>

          <p className="text-center mt-6 text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default SignupPage;
