import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Compass, Home, Search } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-surface border border-brand-border mx-auto flex items-center justify-center text-brand-teal">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-brand-heading font-mono">404</h1>
          <h2 className="text-lg font-semibold text-brand-heading">Aisle Not Found</h2>
          <p className="text-sm text-brand-muted">
            The page you are looking for doesn't exist or has moved to another shelf.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/" className="w-full sm:w-auto">
            <Button className="w-full justify-center">
              <Home className="w-4 h-4 mr-2" /> Return Home
            </Button>
          </Link>
          <Link to="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full justify-center">
              <Search className="w-4 h-4 mr-2" /> Search Stock
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
export default NotFoundPage;

