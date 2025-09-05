import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchableMemberDropdown from './SearchableMemberDropdown';

// Mock Material-UI components for testing
jest.mock('@mui/material', () => ({
  FormControl: ({ children, ...props }) => <div data-testid="form-control" {...props}>{children}</div>,
  InputLabel: ({ children, ...props }) => <label {...props}>{children}</label>,
  Select: ({ children, value, onChange, onOpen, onClose, ...props }) => (
    <select 
      data-testid="select" 
      value={value} 
      onChange={onChange}
      onFocus={onOpen}
      onBlur={onClose}
      {...props}
    >
      {children}
    </select>
  ),
  MenuItem: ({ children, value, disabled, ...props }) => (
    <option value={value} disabled={disabled} {...props}>{children}</option>
  ),
  TextField: ({ value, onChange, placeholder, ...props }) => (
    <input 
      data-testid="search-input"
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  Box: ({ children, ...props }) => <div {...props}>{children}</div>,
  InputAdornment: ({ children, ...props }) => <div {...props}>{children}</div>,
  IconButton: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

jest.mock('@mui/icons-material/Search', () => () => <span>🔍</span>);
jest.mock('@mui/icons-material/Clear', () => () => <span>❌</span>);
jest.mock('@mui/icons-material/Star', () => () => <span>⭐</span>);

const mockMembers = [
  { id: 1, name: 'John Doe', email: 'john@example.com', phone: '1234567890', is_admin: 0 },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', phone: '0987654321', is_admin: 1 },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', phone: '5555555555', is_admin: 0 },
];

describe('SearchableMemberDropdown', () => {
  const defaultProps = {
    value: '',
    onChange: jest.fn(),
    members: mockMembers,
    label: 'Select Member'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with basic props', () => {
    render(<SearchableMemberDropdown {...defaultProps} />);
    
    expect(screen.getByTestId('form-control')).toBeInTheDocument();
    expect(screen.getByTestId('select')).toBeInTheDocument();
    expect(screen.getByText('Select Member')).toBeInTheDocument();
  });

  test('displays all members when no search term', () => {
    render(<SearchableMemberDropdown {...defaultProps} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    expect(screen.getByText('John Doe (ID: 1)')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith (ID: 2)')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson (ID: 3)')).toBeInTheDocument();
  });

  test('filters members by name', () => {
    render(<SearchableMemberDropdown {...defaultProps} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    expect(screen.getByText('John Doe (ID: 1)')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith (ID: 2)')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson (ID: 3)')).not.toBeInTheDocument();
  });

  test('filters members by ID', () => {
    render(<SearchableMemberDropdown {...defaultProps} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: '2' } });
    
    expect(screen.queryByText('John Doe (ID: 1)')).not.toBeInTheDocument();
    expect(screen.getByText('Jane Smith (ID: 2)')).toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson (ID: 3)')).not.toBeInTheDocument();
  });

  test('filters members by phone', () => {
    render(<SearchableMemberDropdown {...defaultProps} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: '1234567890' } });
    
    expect(screen.getByText('John Doe (ID: 1)')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith (ID: 2)')).not.toBeInTheDocument();
    expect(screen.queryByText('Bob Johnson (ID: 3)')).not.toBeInTheDocument();
  });

  test('shows admin icon for admin members', () => {
    render(<SearchableMemberDropdown {...defaultProps} showAdminIcon={true} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    // Check that admin members have star icons
    expect(screen.getByText('Jane Smith (ID: 2) ⭐')).toBeInTheDocument();
  });

  test('includes all option when requested', () => {
    render(
      <SearchableMemberDropdown 
        {...defaultProps} 
        includeAllOption={true}
        allOptionLabel="All users"
        allOptionValue="all"
      />
    );
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    expect(screen.getByText('All users')).toBeInTheDocument();
  });

  test('shows email when showEmail is true', () => {
    render(<SearchableMemberDropdown {...defaultProps} showEmail={true} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    expect(screen.getByText('John Doe (ID: 1) - john@example.com')).toBeInTheDocument();
  });

  test('hides ID when showId is false', () => {
    render(<SearchableMemberDropdown {...defaultProps} showId={false} />);
    
    const select = screen.getByTestId('select');
    fireEvent.focus(select);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('John Doe (ID: 1)')).not.toBeInTheDocument();
  });

  test('calls onChange when member is selected', () => {
    render(<SearchableMemberDropdown {...defaultProps} />);
    
    const select = screen.getByTestId('select');
    fireEvent.change(select, { target: { value: '1' } });
    
    expect(defaultProps.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: '1' } })
    );
  });
});

