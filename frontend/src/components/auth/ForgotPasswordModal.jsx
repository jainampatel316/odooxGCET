import { useState } from 'react';
import { X, Mail, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { authAPI } from '../../utils/api';
import { toast } from '@/hooks/use-toast';

const ForgotPasswordModal = ({ isOpen, onClose }) => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            toast({
                title: "Error",
                description: "Please enter your email address",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            await authAPI.forgotPassword(email);
            toast({
                title: "Success",
                description: "Password reset instructions have been sent to your email.",
            });
            onClose();
            setEmail(''); // Clear email on success
        } catch (error) {
            console.error('Forgot password error:', error);
            toast({
                title: "Error",
                description: error.response?.data?.message || "Failed to process request. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl max-w-md w-full shadow-lg overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b">
                    <h2 className="text-xl font-semibold">Reset Password</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-gray-600 mb-6 text-sm">
                        Enter the email address associated with your account, and we'll send you a new temporary password.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1 text-gray-700">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                                    placeholder="you@example.com"
                                    disabled={isLoading}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-700"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 p-4 text-center border-t">
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordModal;
