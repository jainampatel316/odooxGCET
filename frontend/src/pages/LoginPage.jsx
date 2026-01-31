import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';
import CustomerLayout from '../components/CustomerLayout';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';
import { getUsers, getVendors } from '../utils/storage';
import { sampleUsers, sampleVendors } from '../data/mockData';
import { toast } from '@/hooks/use-toast';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Automatic role detection based on email

      // 1. Check for Admin (highest priority)
      if (email.includes('admin')) {
        login({ id: 'admin-1', name: 'Admin User', email, role: 'admin' });
        toast({ title: "Welcome, Admin!", description: "Redirecting to admin dashboard." });
        navigate('/admin');
      }
      // 2. Check for Vendor
      else {
        const vendor = sampleVendors.find(v => v.email === email);
        if (vendor || email.includes('vendor')) {
          login({ ...vendor, role: 'vendor', id: vendor?.id || 'vendor-demo', name: vendor?.companyName || 'Vendor User', email });
          toast({ title: "Welcome, Vendor!", description: "Redirecting to vendor dashboard." });
          navigate('/vendor');
        }
        // 3. Default to Customer
        else {
          const user = sampleUsers.find(u => u.email === email) || {
            id: `user-${Date.now()}`,
            name: email.split('@')[0],
            email,
            role: 'customer',
            createdAt: new Date().toISOString(),
          };
          login(user);
          toast({ title: "Welcome back!", description: "You're now logged in." });
          navigate(location.state?.from || '/dashboard');
        }
      }
    } catch (error) {
      toast({ title: "Error", description: "Login failed. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="container py-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>


          <div className="bg-card rounded-xl border p-6 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" />
                  <span className="text-sm">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Demo Credentials:</p>
              <p className="text-xs text-muted-foreground mb-2">
                Your role is automatically detected based on your email address.
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><strong>Customer:</strong> john@example.com / any password</p>
                <p><strong>Vendor:</strong> contact@progear.com / any password</p>
                <p><strong>Admin:</strong> admin@rentflow.com / any password</p>
              </div>
            </div>
          </div>

          <p className="text-center mt-6 text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </CustomerLayout>
  );
};

export default LoginPage;
