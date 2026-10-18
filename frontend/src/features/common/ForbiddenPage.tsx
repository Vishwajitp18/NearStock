import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 mx-auto flex items-center justify-center text-red-400">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-heading font-mono">403</h1>
          <h2 className="text-lg font-semibold text-brand-heading">Restricted Access</h2>
          <p className="text-sm text-brand-muted">
            You do not have the required permissions to access this portal. Please sign in with an
            authorized account.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full justify-center">
              <Home className="w-4 h-4 mr-2" /> Return Home
            </Button>
          </Link>
          <Link to="/auth" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full justify-center">
              <ArrowLeft className="w-4 h-4 mr-2" /> Sign In as Different Role
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
export default ForbiddenPage;

