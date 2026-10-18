import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { ResultCard } from '../ResultCard';
import { SearchResultItem } from '../../../types/search';

const mockItem: SearchResultItem = {
  shop: {
    id: 'shop-1',
    name: 'Sharma General Store',
    lat: 12.9716,
    lng: 77.5946,
    phone: '+91 98888 88881',
    address: 'Shop 4, Brigade Road, Bangalore',
  },
  price: 285.0,
  mrp: 290.0,
  in_stock: true,
  quantity_hint: 'Few left',
  distance_m: 450,
  eta_seconds: 240,
  eta_estimated: false,
  stock_updated_at: new Date().toISOString(),
  tags: ['cheapest', 'nearest'],
};

describe('ResultCard Component', () => {
  it('renders shop details and price correctly', () => {
    render(
      <BrowserRouter>
        <ResultCard item={mockItem} />
      </BrowserRouter>
    );

    expect(screen.getByText('Sharma General Store')).toBeInTheDocument();
    expect(screen.getByText('Shop 4, Brigade Road, Bangalore')).toBeInTheDocument();
    expect(screen.getByText(/285/)).toBeInTheDocument();
    expect(screen.getByText(/450 m/)).toBeInTheDocument();
    expect(screen.getByText(/4 min/)).toBeInTheDocument();
  });

  it('renders badges for cheapest and nearest tags', () => {
    render(
      <BrowserRouter>
        <ResultCard item={mockItem} />
      </BrowserRouter>
    );

    expect(screen.getByText(/Cheapest/i)).toBeInTheDocument();
    expect(screen.getByText(/Nearest/i)).toBeInTheDocument();
  });

  it('triggers onSelect when card is clicked', () => {
    const handleSelect = vi.fn();
    render(
      <BrowserRouter>
        <ResultCard item={mockItem} onSelect={handleSelect} />
      </BrowserRouter>
    );

    const card = screen.getByText('Sharma General Store').closest('div');
    if (card) fireEvent.click(card);
    expect(handleSelect).toHaveBeenCalled();
  });
});

