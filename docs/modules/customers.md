# Customer Management Module Specification

## 1. Overview

The Customer Management module is the central hub for managing guest information, preferences, loyalty programs, and customer relationships. It provides comprehensive customer profiles, tracks stay history, manages preferences, and enables personalized service delivery.

### Key Features:
- **Comprehensive customer profiles** with document management
- **Stay history and spending analytics**
- **Preference and special requirements tracking**
- **Loyalty program and rewards management**
- **Corporate account management**
- **Guest feedback and ratings**
- **Marketing segmentation and campaigns**
- **Blacklist and VIP management**
- **GDPR compliance and data privacy**

---

## 2. Database Schema

### 2.1 Main Customers Table

```

### 5.2 React Components

#### Customer List Component

```tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';

export function CustomerList() {
  const [filters, setFilters] = useState({
    search: '',
    customerType: 'all',
    vipStatus: 'all',
    hasStayed: null,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => fetchCustomers(filters),
  });

  const getVIPBadgeColor = (status: VIPStatus) => {
    const colors = {
      diamond: 'bg-purple-100 text-purple-800',
      platinum: 'bg-gray-100 text-gray-800',
      gold: 'bg-yellow-100 text-yellow-800',
      silver: 'bg-slate-100 text-slate-800',
      none: 'bg-white text-gray-500',
    };
    return colors[status] || 'bg-gray-100';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 p-4 bg-white rounded-lg shadow">
        <Input
          placeholder="Search by name, email, phone..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="max-w-xs"
        />
        
        <Select
          value={filters.customerType}
          onValueChange={(value) => setFilters({ ...filters, customerType: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="corporate">Corporate</SelectItem>
            <SelectItem value="travel_agent">Travel Agent</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.vipStatus}
          onValueChange={(value) => setFilters({ ...filters, vipStatus: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All VIP Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="diamond">Diamond</SelectItem>
            <SelectItem value="platinum">Platinum</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="none">None</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={() => exportCustomers(filters)}>
          Export
        </Button>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-lg shadow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>VIP Status</TableHead>
              <TableHead>Loyalty</TableHead>
              <TableHead>Stays</TableHead>
              <TableHead>Total Spent</TableHead>
              <TableHead>Last Stay</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(customer.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{customer.fullName}</div>
                      <div className="text-sm text-gray-500">
                        {customer.customerCode}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{customer.email}</div>
                    <div className="text-gray-500">{customer.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{customer.customerType}</Badge>
                </TableCell>
                <TableCell>
                  <Badge className={getVIPBadgeColor(customer.vipStatus)}>
                    {customer.vipStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  {customer.loyaltyMember && (
                    <div className="text-sm">
                      <div className="font-medium">{customer.loyaltyTier}</div>
                      <div className="text-gray-500">
                        {customer.loyaltyPoints} pts
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div>{customer.totalStays} stays</div>
                    <div className="text-gray-500">
                      {customer.totalNights} nights
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {formatCurrency(customer.totalSpent)}
                </TableCell>
                <TableCell>
                  {customer.lastStayDate && (
                    <div className="text-sm">
                      <div>{formatDate(customer.lastStayDate)}</div>
                      <div className="text-gray-500">
                        {customer.daysSinceLastStay} days ago
                      </div>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <CustomerActions customer={customer} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CustomerActions({ customer }: { customer: Customer }) {
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => viewCustomer(customer.id)}>
        View
      </Button>
      <Button size="sm" variant="outline" onClick={() => newBooking(customer.id)}>
        Book
      </Button>
    </div>
  );
}
```

#### Customer Profile Component

```tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Star,
  TrendingUp,
  Award,
  AlertCircle,
} from 'lucide-react';

interface CustomerProfileProps {
  customerId: string;
}

export function CustomerProfile({ customerId }: CustomerProfileProps) {
  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => fetchCustomerDetails(customerId),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!customer) return <NotFound />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {getInitials(customer.fullName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{customer.fullName}</h2>
                <p className="text-gray-500">{customer.customerCode}</p>
                <div className="flex gap-2 mt-2">
                  <Badge className={getVIPBadgeColor(customer.vipStatus)}>
                    {customer.vipStatus}
                  </Badge>
                  {customer.loyaltyMember && (
                    <Badge variant="outline">
                      {customer.loyaltyTier} • {customer.loyaltyPoints} pts
                    </Badge>
                  )}
                  {customer.isBlacklisted && (
                    <Badge variant="destructive">Blacklisted</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => editCustomer(customerId)}>
                Edit Profile
              </Button>
              <Button variant="outline" onClick={() => newBooking(customerId)}>
                New Booking
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{customer.totalStays}</div>
              <div className="text-sm text-gray-500">Total Stays</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{customer.totalNights}</div>
              <div className="text-sm text-gray-500">Total Nights</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(customer.totalSpent)}
              </div>
              <div className="text-sm text-gray-500">Total Spent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {customer.averageSatisfaction || 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Avg Satisfaction</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stays">Stay History</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <CustomerOverview customer={customer} />
        </TabsContent>

        <TabsContent value="stays">
          <CustomerStayHistory customerId={customerId} />
        </TabsContent>

        <TabsContent value="preferences">
          <CustomerPreferences customerId={customerId} />
        </TabsContent>

        <TabsContent value="loyalty">
          <CustomerLoyalty customerId={customerId} />
        </TabsContent>

        <TabsContent value="documents">
          <CustomerDocuments customerId={customerId} />
        </TabsContent>

        <TabsContent value="feedback">
          <CustomerFeedback customerId={customerId} />
        </TabsContent>

        <TabsContent value="communications">
          <CustomerCommunications customerId={customerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerOverview({ customer }: { customer: Customer }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium">Email</div>
              <div>{customer.email}</div>
              {customer.emailVerified && (
                <Badge variant="outline" className="text-xs">
                  Verified
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium">Phone</div>
              <div>{customer.phone}</div>
              {customer.whatsappNumber && (
                <div className="text-sm text-gray-500">
                  WhatsApp: {customer.whatsappNumber}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-gray-400" />
            <div>
              <div className="text-sm font-medium">Address</div>
              <div className="text-sm">
                {customer.address?.line1}<br />
                {customer.address?.city}, {customer.address?.country}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Date of Birth</div>
              <div>{formatDate(customer.dateOfBirth)}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Age</div>
              <div>{customer.age} years</div>
            </div>
            <div>
              <div className="text-sm font-medium">Gender</div>
              <div>{customer.gender}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Nationality</div>
              <div>{customer.nationality}</div>
            </div>
            <div>
              <div className="text-sm font-medium">ID Type</div>
              <div>{customer.idType}</div>
            </div>
            <div>
              <div className="text-sm font-medium">ID Number</div>
              <div>{customer.idNumber}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags and Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Tags & Segments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          {customer.customerSegment && (
            <div className="mt-3">
              <div className="text-sm font-medium">Segment</div>
              <div>{customer.customerSegment}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Internal Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{customer.internalNotes}</p>
          {customer.specialAttention && (
            <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium">Special Attention</span>
              </div>
              <p className="text-sm mt-1">{customer.specialAttention}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

#### Customer Preferences Component

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bed,
  Coffee,
  Wifi,
  Accessibility,
  Briefcase,
  Heart,
  MessageSquare,
} from 'lucide-react';

interface CustomerPreferencesProps {
  customerId: string;
}

export function CustomerPreferences({ customerId }: CustomerPreferencesProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['customer-preferences', customerId],
    queryFn: () => fetchCustomerPreferences(customerId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateCustomerPreferences(customerId, data),
    onSuccess: () => {
      setIsEditing(false);
      queryClient.invalidateQueries(['customer-preferences', customerId]);
    },
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Customer Preferences</h3>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          variant={isEditing ? 'default' : 'outline'}
        >
          {isEditing ? 'Save Changes' : 'Edit Preferences'}
        </Button>
      </div>

      <Tabs defaultValue="room" className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="room">
            <Bed className="h-4 w-4 mr-2" />
            Room
          </TabsTrigger>
          <TabsTrigger value="food">
            <Coffee className="h-4 w-4 mr-2" />
            Food
          </TabsTrigger>
          <TabsTrigger value="amenities">
            <Wifi className="h-4 w-4 mr-2" />
            Amenities
          </TabsTrigger>
          <TabsTrigger value="accessibility">
            <Accessibility className="h-4 w-4 mr-2" />
            Access
          </TabsTrigger>
          <TabsTrigger value="business">
            <Briefcase className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="recreation">
            <Heart className="h-4 w-4 mr-2" />
            Recreation
          </TabsTrigger>
          <TabsTrigger value="communication">
            <MessageSquare className="h-4 w-4 mr-2" />
            Comms
          </TabsTrigger>
        </TabsList>

        <TabsContent value="room">
          <Card>
            <CardHeader>
              <CardTitle>Room Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Preferred Room Location</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['high_floor', 'quiet', 'away_from_elevator', 'near_exit'].map(
                    (location) => (
                      <Badge
                        key={location}
                        variant={
                          preferences?.room?.location?.includes(location)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => isEditing && togglePreference('room.location', location)}
                      >
                        {location.replace('_', ' ')}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bed Type</Label>
                  <div className="flex gap-2 mt-2">
                    {['king', 'queen', 'twin'].map((type) => (
                      <Badge
                        key={type}
                        variant={preferences?.room?.bedType === type ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => isEditing && setPreference('room.bedType', type)}
                      >
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Bed Firmness</Label>
                  <div className="flex gap-2 mt-2">
                    {['soft', 'medium', 'firm'].map((firmness) => (
                      <Badge
                        key={firmness}
                        variant={
                          preferences?.room?.bedFirmness === firmness
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => isEditing && setPreference('room.bedFirmness', firmness)}
                      >
                        {firmness}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Room Temperature</Label>
                  <div className="flex gap-2 mt-2">
                    {['cool', 'moderate', 'warm'].map((temp) => (
                      <Badge
                        key={temp}
                        variant={
                          preferences?.room?.temperature === temp
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => isEditing && setPreference('room.temperature', temp)}
                      >
                        {temp}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>View Preference</Label>
                  <div className="flex gap-2 mt-2">
                    {['sea', 'city', 'garden', 'mountain'].map((view) => (
                      <Badge
                        key={view}
                        variant={preferences?.room?.view === view ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => isEditing && setPreference('room.view', view)}
                      >
                        {view}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="food">
          <Card>
            <CardHeader>
              <CardTitle>Food & Beverage Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Dietary Restrictions</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    'vegetarian',
                    'vegan',
                    'halal',
                    'kosher',
                    'gluten_free',
                    'dairy_free',
                  ].map((diet) => (
                    <Badge
                      key={diet}
                      variant={
                        preferences?.dietary?.restrictions?.includes(diet)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer"
                      onClick={() => isEditing && togglePreference('dietary.restrictions', diet)}
                    >
                      {diet.replace('_', ' ')}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Allergies</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['peanuts', 'shellfish', 'dairy', 'eggs', 'soy', 'wheat'].map(
                    (allergy) => (
                      <Badge
                        key={allergy}
                        variant={
                          preferences?.dietary?.allergies?.includes(allergy)
                            ? 'destructive'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => isEditing && togglePreference('dietary.allergies', allergy)}
                      >
                        {allergy}
                      </Badge>
                    )
                  )}
                </div>
              </div>

              <div>
                <Label>Beverage Preferences</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['coffee', 'tea', 'juice', 'wine', 'beer', 'cocktails'].map(
                    (beverage) => (
                      <Badge
                        key={beverage}
                        variant={
                          preferences?.dietary?.beverages?.includes(beverage)
                            ? 'default'
                            : 'outline'
                        }
                        className="cursor-pointer"
                        onClick={() => isEditing && togglePreference('dietary.beverages', beverage)}
                      >
                        {beverage}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Additional tabs content... */}
      </Tabs>
    </div>
  );
}
```

#### Customer Search Component

```tsx
import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import debounce from 'lodash/debounce';

interface CustomerSearchProps {
  value?: string;
  onSelect: (customer: Customer) => void;
  placeholder?: string;
}

export function CustomerSearch({
  value,
  onSelect,
  placeholder = "Search customers...",
}: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const debouncedSearch = useCallback(
    debounce((value: string) => setSearch(value), 300),
    []
  );

  const { data: customers, isLoading } = useQuery({
    queryKey: ['customer-search', search],
    queryFn: () => searchCustomers(search),
    enabled: search.length >= 2,
  });

  const { data: selectedCustomer } = useQuery({
    queryKey: ['customer', value],
    queryFn: () => fetchCustomer(value!),
    enabled: !!value,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {selectedCustomer ? (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{selectedCustomer.fullName}</span>
              <span className="text-gray-500">({selectedCustomer.customerCode})</span>
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder="Search by name, email, or phone..."
            onValueChange={debouncedSearch}
          />
          <CommandEmpty>
            {isLoading ? 'Searching...' : 'No customers found.'}
          </CommandEmpty>
          <CommandGroup>
            {customers?.map((customer) => (
              <CommandItem
                key={customer.id}
                value={customer.id}
                onSelect={() => {
                  onSelect(customer);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    'mr-2 h-4 w-4',
                    value === customer.id ? 'opacity-100' : 'opacity-0'
                  )}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{customer.fullName}</span>
                    {customer.vipStatus !== 'none' && (
                      <Badge className="text-xs">{customer.vipStatus}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {customer.email} • {customer.phone}
                  </div>
                </div>
              </CommandItem>
            ))}
            <CommandItem
              onSelect={() => {
                setOpen(false);
                openNewCustomerModal();
              }}
            >
              <User className="mr-2 h-4 w-4" />
              <span>Create New Customer</span>
            </CommandItem>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

---

## 6. Reports and Analytics

### 6.1 Customer Analytics Queries

```sql
-- Customer segmentation analysis
WITH customer_metrics AS (
    SELECT 
        c.id,
        c.full_name,
        c.vip_status,
        c.total_stays,
        c.total_spent,
        c.days_since_last_stay,
        CASE 
            WHEN c.total_spent >= 100000000 THEN 'high_value'
            WHEN c.total_spent >= 50000000 THEN 'medium_value'
            ELSE 'low_value'
        END as value_segment,
        CASE 
            WHEN c.total_stays >= 10 THEN 'frequent'
            WHEN c.total_stays >= 5 THEN 'regular'
            WHEN c.total_stays >= 2 THEN 'returning'
            ELSE 'new'
        END as frequency_segment,
        CASE 
            WHEN c.days_since_last_stay <= 30 THEN 'recent'
            WHEN c.days_since_last_stay <= 90 THEN 'active'
            WHEN c.days_since_last_stay <= 365 THEN 'lapsed'
            ELSE 'dormant'
        END as recency_segment
    FROM customers c
    WHERE c.is_blacklisted = false
)
SELECT 
    value_segment,
    frequency_segment,
    recency_segment,
    COUNT(*) as customer_count,
    AVG(total_spent) as avg_spent,
    AVG(total_stays) as avg_stays
FROM customer_metrics
GROUP BY value_segment, frequency_segment, recency_segment
ORDER BY customer_count DESC;

-- Customer lifetime value analysis
SELECT 
    c.customer_segment,
    COUNT(*) as customer_count,
    AVG(c.total_spent) as avg_lifetime_value,
    AVG(c.total_stays) as avg_stays,
    AVG(c.total_nights) as avg_nights,
    AVG(c.total_spent / NULLIF(c.total_stays, 0)) as avg_spend_per_stay,
    SUM(c.total_spent) as total_revenue
FROM customers c
WHERE c.total_stays > 0
GROUP BY c.customer_segment
ORDER BY total_revenue DESC;

-- Customer acquisition and retention
SELECT 
    DATE_TRUNC('month', c.created_at) as month,
    COUNT(*) as new_customers,
    COUNT(CASE WHEN c.total_stays > 1 THEN 1 END) as returning_customers,
    ROUND(COUNT(CASE WHEN c.total_stays > 1 THEN 1 END)::DECIMAL / COUNT(*) * 100, 2) as retention_rate
FROM customers c
GROUP BY DATE_TRUNC('month', c.created_at)
ORDER BY month DESC;

-- VIP customer analysis
SELECT 
    vip_status,
    COUNT(*) as customer_count,
    SUM(total_spent) as total_revenue,
    AVG(total_spent) as avg_spent,
    AVG(total_stays) as avg_stays,
    AVG(loyalty_points) as avg_loyalty_points
FROM customers
WHERE vip_status != 'none'
GROUP BY vip_status
ORDER BY 
    CASE vip_status
        WHEN 'diamond' THEN 1
        WHEN 'platinum' THEN 2
        WHEN 'gold' THEN 3
        WHEN 'silver' THEN 4
    END;
```

### 6.2 Customer Behavior Analytics

```sql
-- Preference patterns
SELECT 
    cp.category,
    cp.room_location,
    cp.bed_type,
    cp.dietary_restrictions,
    COUNT(DISTINCT cp.customer_id) as customer_count
FROM customer_preferences cp
JOIN customers c ON cp.customer_id = c.id
WHERE c.total_stays >= 3
GROUP BY cp.category, cp.room_location, cp.bed_type, cp.dietary_restrictions
ORDER BY customer_count DESC;

-- Feedback sentiment analysis
SELECT 
    DATE_TRUNC('month', cf.feedback_date) as month,
    cf.sentiment,
    COUNT(*) as feedback_count,
    AVG(cf.overall_rating) as avg_rating,
    AVG(cf.nps_score) as avg_nps
FROM customer_feedback cf
GROUP BY DATE_TRUNC('month', cf.feedback_date), cf.sentiment
ORDER BY month DESC, feedback_count DESC;

-- Customer journey analysis
WITH customer_journey AS (
    SELECT 
        c.id,
        c.acquisition_channel,
        c.first_stay_date,
        c.last_stay_date,
        c.total_stays,
        b.source,
        COUNT(DISTINCT b.id) as bookings_per_source
    FROM customers c
    LEFT JOIN bookings b ON c.id = b.customer_id
    GROUP BY c.id, c.acquisition_channel, c.first_stay_date, 
             c.last_stay_date, c.total_stays, b.source
)
SELECT 
    acquisition_channel,
    source as booking_source,
    COUNT(DISTINCT id) as customers,
    AVG(total_stays) as avg_stays,
    AVG(EXTRACT(DAY FROM last_stay_date - first_stay_date)) as avg_customer_lifetime_days
FROM customer_journey
GROUP BY acquisition_channel, source
ORDER BY customers DESC;
```

---

## 7. Integration Points

### 7.1 CRM Integration

```python
class CRMIntegration:
    """
    Integration with external CRM systems.
    """
    
    def sync_customer_to_crm(self, customer_id):
        """Sync customer data to external CRM."""
        
        customer = get_customer(customer_id)
        
        crm_data = {
            'external_id': customer.id,
            'first_name': customer.first_name,
            'last_name': customer.last_name,
            'email': customer.email,
            'phone': customer.phone,
            'company': customer.company_name,
            'tags': customer.tags,
            'custom_fields': {
                'total_stays': customer.total_stays,
                'total_spent': customer.total_spent,
                'vip_status': customer.vip_status,
                'loyalty_tier': customer.loyalty_tier
            }
        }
        
        if customer.external_id:
            # Update existing
            self.crm_api.update_contact(customer.external_id, crm_data)
        else:
            # Create new
            external_id = self.crm_api.create_contact(crm_data)
            customer.external_id = external_id
            customer.save()
        
        return True
    
    def sync_from_crm(self):
        """Import customers from CRM."""
        
        contacts = self.crm_api.get_contacts(modified_since=self.last_sync)
        
        for contact in contacts:
            customer_data = self.map_crm_to_customer(contact)
            
            existing = find_customer_by_email(contact['email'])
            if existing:
                update_customer(existing.id, customer_data)
            else:
                create_customer(customer_data)
```

### 7.2 Marketing Automation

```python
class MarketingAutomation:
    """
    Marketing automation and campaign management.
    """
    
    def segment_customers_for_campaign(self, campaign_criteria):
        """Segment customers for marketing campaign."""
        
        segments = []
        
        # Build query based on criteria
        query = Customer.query()
        
        if campaign_criteria.get('vip_status'):
            query = query.filter(vip_status__in=campaign_criteria['vip_status'])
        
        if campaign_criteria.get('min_stays'):
            query = query.filter(total_stays__gte=campaign_criteria['min_stays'])
        
        if campaign_criteria.get('recency_days'):
            cutoff_date = date.today() - timedelta(days=campaign_criteria['recency_days'])
            query = query.filter(last_stay_date__gte=cutoff_date)
        
        if campaign_criteria.get('tags'):
            query = query.filter(tags__contains=campaign_criteria['tags'])
        
        customers = query.all()
        
        return customers
    
    def trigger_lifecycle_campaigns(self, customer_id):
        """Trigger automated campaigns based on customer lifecycle."""
        
        customer = get_customer(customer_id)
        
        # Welcome campaign for new customers
        if customer.total_stays == 0:
            send_campaign('welcome_series', customer)
        
        # Win-back campaign for lapsed customers
        elif customer.days_since_last_stay > 180:
            send_campaign('win_back', customer)
        
        # VIP upgrade campaign
        elif is_close_to_vip_upgrade(customer):
            send_campaign('vip_upgrade', customer)
        
        # Birthday campaign
        elif is_birthday_month(customer):
            send_campaign('birthday_special', customer)
        
        # Loyalty milestone campaign
        elif has_reached_loyalty_milestone(customer):
            send_campaign('loyalty_milestone', customer)
```

---

## 8. Security and Privacy

### 8.1 Data Encryption

```python
from cryptography.fernet import Fernet

class CustomerDataEncryption:
    """
    Encrypt sensitive customer data.
    """
    
    def __init__(self):
        self.key = load_encryption_key()
        self.cipher = Fernet(self.key)
    
    def encrypt_sensitive_fields(self, customer_data):
        """Encrypt sensitive customer fields."""
        
        sensitive_fields = [
            'id_number',
            'tax_id',
            'medical_notes',
            'credit_card_info'
        ]
        
        for field in sensitive_fields:
            if field in customer_data and customer_data[field]:
                encrypted = self.cipher.encrypt(
                    customer_data[field].encode()
                )
                customer_data[f'{field}_encrypted'] = encrypted.decode()
                customer_data[field] = None
        
        return customer_data
    
    def decrypt_field(self, encrypted_value):
        """Decrypt a single field."""
        
        if not encrypted_value:
            return None
        
        try:
            decrypted = self.cipher.decrypt(encrypted_value.encode())
            return decrypted.decode()
        except Exception:
            log_decryption_error()
            return None
```

### 8.2 Audit Logging

```python
class CustomerAuditLog:
    """
    Audit logging for customer data access and modifications.
    """
    
    def log_access(self, customer_id, user_id, action, details=None):
        """Log customer data access."""
        
        AuditLog.create({
            'entity_type': 'customer',
            'entity_id': customer_id,
            'user_id': user_id,
            'action': action,
            'details': details,
            'ip_address': get_client_ip(),
            'user_agent': get_user_agent(),
            'timestamp': datetime.now()
        })
    
    def log_modification(self, customer_id, user_id, changes):
        """Log customer data modifications."""
        
        for field, (old_value, new_value) in changes.items():
            AuditLog.create({
                'entity_type': 'customer',
                'entity_id': customer_id,
                'user_id': user_id,
                'action': 'update',
                'field': field,
                'old_value': self.sanitize_value(old_value),
                'new_value': self.sanitize_value(new_value),
                'timestamp': datetime.now()
            })
    
    def sanitize_value(self, value):
        """Sanitize sensitive values for logging."""
        
        sensitive_patterns = {
            'credit_card': r'\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}',
            'ssn': r'\d{3}-\d{2}-\d{4}',
            'id_number': r'[A-Z]\d{8}'
        }
        
        for pattern_name, pattern in sensitive_patterns.items():
            if re.match(pattern, str(value)):
                return f'[{pattern_name}_masked]'
        
        return value
```

---

## 9. Best Practices

### 9.1 Data Quality
- Implement duplicate detection on customer creation
- Regular data cleansing and validation
- Standardize phone numbers and addresses
- Validate email addresses
- Maintain data completeness scores

### 9.2 Privacy Compliance
- GDPR-compliant data handling
- Consent management for marketing
- Data retention policies
- Right to deletion implementation
- Data portability features

### 9.3 Performance Optimization
- Index frequently searched fields
- Cache customer preferences
- Lazy load related data
- Implement pagination for large datasets
- Use database views for complex queries

### 9.4 Customer Experience
- Quick customer search and selection
- Auto-fill from previous stays
- Preference learning from behavior
- Proactive preference application
- Seamless profile updates

---

*Document Version: 1.0*  
*Last Updated: [Current Date]*  
*Module: Customer Management*  
*System: Homestay/Hotel Management System*sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_code VARCHAR(20) UNIQUE NOT NULL, -- Format: C20240001
    customer_type VARCHAR(20) DEFAULT 'individual', 
    -- 'individual', 'corporate', 'travel_agent', 'government'
    
    -- Personal Information
    title VARCHAR(20), -- 'Mr', 'Mrs', 'Ms', 'Dr', 'Prof'
    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200) NOT NULL,
    display_name VARCHAR(200), -- Preferred name for communications
    
    -- Birth and Gender
    date_of_birth DATE,
    age INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN date_of_birth IS NOT NULL 
            THEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth))
            ELSE NULL
        END
    ) STORED,
    gender VARCHAR(20), -- 'male', 'female', 'other', 'prefer_not_to_say'
    
    -- Nationality and Language
    nationality VARCHAR(100),
    passport_country VARCHAR(100),
    languages_spoken TEXT[], -- ['English', 'Vietnamese', 'French']
    preferred_language VARCHAR(10) DEFAULT 'en', -- ISO 639-1 code
    
    -- Contact Information
    email VARCHAR(200),
    email_verified BOOLEAN DEFAULT false,
    alternative_email VARCHAR(200),
    phone VARCHAR(20),
    phone_verified BOOLEAN DEFAULT false,
    alternative_phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    wechat_id VARCHAR(100),
    
    -- Address
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    state_province VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    
    -- Identification Documents
    id_type VARCHAR(50), -- 'passport', 'national_id', 'driver_license'
    id_number VARCHAR(100),
    id_issue_date DATE,
    id_expiry_date DATE,
    id_issuing_country VARCHAR(100),
    id_front_image TEXT, -- URL to R2 storage
    id_back_image TEXT,
    
    -- Secondary ID (if needed)
    secondary_id_type VARCHAR(50),
    secondary_id_number VARCHAR(100),
    secondary_id_expiry DATE,
    
    -- Company Information (for corporate customers)
    company_id UUID REFERENCES companies(id),
    company_name VARCHAR(200),
    job_title VARCHAR(100),
    department VARCHAR(100),
    company_email VARCHAR(200),
    company_phone VARCHAR(20),
    
    -- Tax Information
    tax_id VARCHAR(50),
    tax_id_type VARCHAR(50), -- 'vat', 'ein', 'gst'
    billing_address TEXT,
    
    -- Customer Categories
    vip_status VARCHAR(20) DEFAULT 'none', -- 'none', 'silver', 'gold', 'platinum', 'diamond'
    vip_status_expiry DATE,
    customer_segment VARCHAR(50), -- 'leisure', 'business', 'group', 'long_stay'
    customer_source VARCHAR(50), -- 'walk_in', 'website', 'referral', 'corporate', 'ota'
    referral_source VARCHAR(200), -- Specific referral details
    acquisition_channel VARCHAR(100),
    acquisition_date DATE,
    
    -- Loyalty Program
    loyalty_member BOOLEAN DEFAULT false,
    loyalty_number VARCHAR(50) UNIQUE,
    loyalty_tier VARCHAR(20), -- 'bronze', 'silver', 'gold', 'platinum'
    loyalty_points INTEGER DEFAULT 0,
    lifetime_points INTEGER DEFAULT 0,
    loyalty_join_date DATE,
    loyalty_expiry_date DATE,
    points_expiry_date DATE,
    
    -- Statistics
    first_stay_date DATE,
    last_stay_date DATE,
    total_stays INTEGER DEFAULT 0,
    total_nights INTEGER DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    average_spent_per_stay DECIMAL(10,2) DEFAULT 0,
    average_stay_length DECIMAL(4,1) DEFAULT 0,
    total_cancellations INTEGER DEFAULT 0,
    no_show_count INTEGER DEFAULT 0,
    
    -- Preferences (detailed in separate table)
    preferences_summary JSONB,
    /* {
        "room": ["high_floor", "quiet", "away_from_elevator"],
        "bed": "king",
        "pillow": "firm",
        "amenities": ["extra_towels", "bathrobes"],
        "dietary": ["vegetarian", "no_nuts"],
        "interests": ["spa", "golf", "dining"]
    } */
    
    -- Marketing
    marketing_consent BOOLEAN DEFAULT false,
    marketing_consent_date TIMESTAMP,
    email_opt_in BOOLEAN DEFAULT false,
    sms_opt_in BOOLEAN DEFAULT false,
    phone_opt_in BOOLEAN DEFAULT false,
    mail_opt_in BOOLEAN DEFAULT false,
    third_party_opt_in BOOLEAN DEFAULT false,
    
    -- Special Notes
    tags TEXT[], -- ['vip', 'frequent_traveler', 'corporate', 'problematic']
    internal_notes TEXT,
    special_attention TEXT,
    medical_notes TEXT, -- Encrypted
    
    -- Blacklist/Warnings
    is_blacklisted BOOLEAN DEFAULT false,
    blacklist_reason TEXT,
    blacklisted_date TIMESTAMP,
    blacklisted_by UUID REFERENCES users(id),
    warning_level INTEGER DEFAULT 0, -- 0-5 scale
    warning_notes TEXT,
    
    -- Credit and Payment
    credit_limit DECIMAL(10,2),
    current_balance DECIMAL(10,2) DEFAULT 0,
    payment_terms VARCHAR(50), -- 'prepaid', 'on_arrival', 'on_departure', 'net_30'
    default_payment_method VARCHAR(50),
    
    -- Data Privacy
    gdpr_consent BOOLEAN DEFAULT false,
    gdpr_consent_date TIMESTAMP,
    data_retention_consent BOOLEAN DEFAULT true,
    deletion_requested BOOLEAN DEFAULT false,
    deletion_requested_date TIMESTAMP,
    anonymized BOOLEAN DEFAULT false,
    
    -- Social Media
    facebook_profile VARCHAR(200),
    instagram_handle VARCHAR(100),
    twitter_handle VARCHAR(100),
    linkedin_profile VARCHAR(200),
    
    -- Profile Completion
    profile_completeness INTEGER DEFAULT 0, -- Percentage 0-100
    profile_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    source_system VARCHAR(50), -- For migrated data
    external_id VARCHAR(100), -- ID from external system
    
    -- Computed fields for quick access
    is_returning BOOLEAN GENERATED ALWAYS AS (total_stays > 1) STORED,
    days_since_last_stay INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN last_stay_date IS NOT NULL 
            THEN EXTRACT(DAY FROM CURRENT_DATE - last_stay_date)
            ELSE NULL
        END
    ) STORED
);

-- Indexes for performance
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name ON customers(full_name);
CREATE INDEX idx_customers_code ON customers(customer_code);
CREATE INDEX idx_customers_loyalty ON customers(loyalty_number);
CREATE INDEX idx_customers_company ON customers(company_id);
CREATE INDEX idx_customers_vip ON customers(vip_status) WHERE vip_status != 'none';
CREATE INDEX idx_customers_blacklist ON customers(is_blacklisted) WHERE is_blacklisted = true;
CREATE INDEX idx_customers_type ON customers(customer_type);
CREATE INDEX idx_customers_search ON customers USING GIN (
    to_tsvector('english', 
        COALESCE(full_name, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(phone, '') || ' ' ||
        COALESCE(company_name, '')
    )
);
```

### 2.2 Customer Preferences

```sql
CREATE TABLE customer_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL, -- 'room', 'food', 'service', 'communication'
    
    -- Room Preferences
    room_location TEXT[], -- ['high_floor', 'near_elevator', 'away_from_ice_machine']
    room_type_preference VARCHAR(100),
    bed_type VARCHAR(50), -- 'king', 'queen', 'twin', 'any'
    bed_firmness VARCHAR(20), -- 'soft', 'medium', 'firm'
    pillow_type VARCHAR(50), -- 'soft', 'firm', 'feather', 'memory_foam'
    pillow_count INTEGER,
    room_temperature VARCHAR(20), -- 'cool', 'moderate', 'warm'
    floor_preference VARCHAR(50), -- 'high', 'middle', 'low', 'specific:5'
    view_preference VARCHAR(50), -- 'sea', 'city', 'garden', 'mountain'
    
    -- Amenity Preferences
    minibar_preferences JSONB,
    /* {
        "stock": ["water", "juice", "beer"],
        "remove": ["alcohol", "peanuts"],
        "extra": ["diet_coke"]
    } */
    bathroom_amenities TEXT[], -- ['bathrobes', 'slippers', 'extra_towels']
    room_amenities TEXT[], -- ['iron', 'hair_dryer', 'coffee_maker']
    
    -- Service Preferences
    housekeeping_time VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'no_service'
    turndown_service BOOLEAN DEFAULT false,
    wake_up_call_time TIME,
    do_not_disturb_hours JSONB, -- [{"from": "14:00", "to": "16:00"}]
    newspaper VARCHAR(100), -- Newspaper preference
    newspaper_language VARCHAR(10),
    
    -- Food & Beverage
    dietary_restrictions TEXT[], -- ['vegetarian', 'vegan', 'halal', 'kosher', 'gluten_free']
    food_allergies TEXT[], -- ['peanuts', 'shellfish', 'dairy', 'eggs']
    meal_preferences JSONB,
    /* {
        "breakfast": {
            "type": "continental",
            "time": "07:00",
            "location": "room",
            "items": ["coffee", "croissant", "fruit"]
        },
        "minibar": {
            "restock": "daily",
            "preferences": ["no_alcohol", "extra_water"]
        }
    } */
    favorite_dishes TEXT[],
    beverage_preferences TEXT[], -- ['coffee', 'tea', 'wine:red', 'beer:local']
    
    -- Special Occasions
    special_occasions JSONB,
    /* [
        {
            "date": "08-15",
            "occasion": "birthday",
            "preferences": "chocolate_cake"
        },
        {
            "date": "12-20",
            "occasion": "anniversary",
            "preferences": "champagne"
        }
    ] */
    
    -- Accessibility Needs
    accessibility_required BOOLEAN DEFAULT false,
    mobility_assistance VARCHAR(100), -- 'wheelchair', 'walker', 'cane'
    hearing_assistance BOOLEAN DEFAULT false,
    visual_assistance BOOLEAN DEFAULT false,
    other_assistance TEXT,
    
    -- Transportation
    airport_transfer VARCHAR(50), -- 'required', 'not_needed', 'on_request'
    preferred_transport VARCHAR(50), -- 'taxi', 'private_car', 'shuttle'
    car_rental_preference VARCHAR(100),
    parking_required BOOLEAN DEFAULT false,
    
    -- Business Preferences
    business_center_access BOOLEAN DEFAULT false,
    meeting_room_preference VARCHAR(100),
    work_desk_required BOOLEAN DEFAULT true,
    high_speed_internet BOOLEAN DEFAULT true,
    printer_access BOOLEAN DEFAULT false,
    
    -- Recreation Preferences
    gym_access BOOLEAN DEFAULT false,
    spa_interest BOOLEAN DEFAULT false,
    pool_access BOOLEAN DEFAULT false,
    preferred_activities TEXT[], -- ['golf', 'tennis', 'yoga', 'swimming']
    
    -- Communication Preferences
    preferred_contact_method VARCHAR(50), -- 'email', 'phone', 'sms', 'whatsapp'
    preferred_contact_time VARCHAR(50), -- 'morning', 'afternoon', 'evening', 'anytime'
    language_preference VARCHAR(10),
    communication_frequency VARCHAR(50), -- 'all', 'important_only', 'none'
    
    -- Privacy Preferences
    photo_consent BOOLEAN DEFAULT true,
    social_media_consent BOOLEAN DEFAULT false,
    room_entry_notification BOOLEAN DEFAULT false,
    
    -- Metadata
    last_updated TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    notes TEXT
);

-- Indexes
CREATE INDEX idx_customer_preferences_customer ON customer_preferences(customer_id);
CREATE INDEX idx_customer_preferences_category ON customer_preferences(category);
```

### 2.3 Customer Documents

```sql
CREATE TABLE customer_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    -- 'passport', 'visa', 'id_card', 'driver_license', 'insurance', 'corporate_id', 'other'
    
    document_number VARCHAR(100),
    document_name VARCHAR(200),
    
    -- Document Details
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(200),
    issuing_country VARCHAR(100),
    
    -- File Storage
    file_url TEXT, -- URL to R2 storage
    file_thumbnail TEXT,
    file_size INTEGER, -- in bytes
    file_type VARCHAR(50), -- 'pdf', 'jpg', 'png'
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_date TIMESTAMP,
    verified_by UUID REFERENCES users(id),
    verification_notes TEXT,
    
    -- Security
    is_encrypted BOOLEAN DEFAULT true,
    encryption_key_id VARCHAR(100),
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'expired', 'archived'
    
    -- Metadata
    uploaded_at TIMESTAMP DEFAULT NOW(),
    uploaded_by UUID REFERENCES users(id),
    last_accessed TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    
    -- Compliance
    retention_date DATE, -- When document can be deleted
    deletion_scheduled BOOLEAN DEFAULT false
);

-- Indexes
CREATE INDEX idx_customer_documents_customer ON customer_documents(customer_id);
CREATE INDEX idx_customer_documents_type ON customer_documents(document_type);
CREATE INDEX idx_customer_documents_expiry ON customer_documents(expiry_date);
```

### 2.4 Customer Relationships

```sql
CREATE TABLE customer_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    related_customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL,
    -- 'spouse', 'child', 'parent', 'sibling', 'colleague', 'friend', 'assistant'
    
    -- Relationship Details
    is_primary BOOLEAN DEFAULT false,
    can_make_bookings BOOLEAN DEFAULT false,
    share_preferences BOOLEAN DEFAULT false,
    share_loyalty_benefits BOOLEAN DEFAULT false,
    
    -- For family/group bookings
    same_room_preference BOOLEAN DEFAULT false,
    adjacent_room_preference BOOLEAN DEFAULT false,
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Ensure no duplicate relationships
    UNIQUE(customer_id, related_customer_id, relationship_type)
);

-- Indexes
CREATE INDEX idx_customer_relationships_customer ON customer_relationships(customer_id);
CREATE INDEX idx_customer_relationships_related ON customer_relationships(related_customer_id);
```

### 2.5 Customer Stay History

```sql
CREATE TABLE customer_stay_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    
    -- Stay Details
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    nights INTEGER,
    room_type VARCHAR(100),
    room_number VARCHAR(20),
    rate_type VARCHAR(50),
    
    -- Financial
    room_rate DECIMAL(10,2),
    total_room_charge DECIMAL(10,2),
    total_extras DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    
    -- Experience
    purpose_of_visit VARCHAR(50), -- 'leisure', 'business', 'event'
    satisfaction_score INTEGER, -- 1-10
    would_recommend BOOLEAN,
    would_return BOOLEAN,
    
    -- Preferences Noted
    preferences_during_stay JSONB,
    special_requests_fulfilled JSONB,
    complaints JSONB,
    compliments JSONB,
    
    -- Service Recovery
    issues_reported TEXT[],
    compensation_provided JSONB,
    
    -- Staff Interactions
    staff_notes TEXT,
    memorable_experiences TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    source_system VARCHAR(50) -- For historical data migration
);

-- Indexes
CREATE INDEX idx_stay_history_customer ON customer_stay_history(customer_id);
CREATE INDEX idx_stay_history_dates ON customer_stay_history(check_in_date, check_out_date);
CREATE INDEX idx_stay_history_booking ON customer_stay_history(booking_id);
```

### 2.6 Customer Communications

```sql
CREATE TABLE customer_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    
    -- Communication Details
    type VARCHAR(50) NOT NULL,
    -- 'marketing', 'transactional', 'service', 'feedback', 'complaint', 'survey'
    channel VARCHAR(50) NOT NULL,
    -- 'email', 'sms', 'phone', 'letter', 'in_person', 'whatsapp'
    direction VARCHAR(10), -- 'inbound', 'outbound'
    
    -- Content
    subject VARCHAR(500),
    content TEXT,
    summary TEXT,
    
    -- Campaign/Template
    campaign_id UUID REFERENCES marketing_campaigns(id),
    template_id UUID REFERENCES communication_templates(id),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending',
    -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'responded', 'failed'
    
    -- Tracking
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    responded_at TIMESTAMP,
    
    -- Response
    response_required BOOLEAN DEFAULT false,
    response_received BOOLEAN DEFAULT false,
    response_content TEXT,
    
    -- Engagement Metrics
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_date DATE,
    follow_up_completed BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    tags TEXT[]
);

-- Indexes
CREATE INDEX idx_customer_communications_customer ON customer_communications(customer_id);
CREATE INDEX idx_customer_communications_type ON customer_communications(type);
CREATE INDEX idx_customer_communications_date ON customer_communications(created_at);
CREATE INDEX idx_customer_communications_campaign ON customer_communications(campaign_id);
```

### 2.7 Loyalty Program

```sql
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjust'
    
    -- Points
    points INTEGER NOT NULL, -- Positive for earn, negative for redeem
    points_balance_before INTEGER,
    points_balance_after INTEGER,
    
    -- Source
    source VARCHAR(50), -- 'stay', 'dining', 'spa', 'referral', 'promotion', 'manual'
    source_reference VARCHAR(100), -- booking_id, invoice_id, etc.
    
    -- For earnings
    base_amount DECIMAL(10,2), -- Amount that generated points
    multiplier DECIMAL(3,2) DEFAULT 1.0, -- Bonus multiplier applied
    
    -- For redemptions
    redemption_type VARCHAR(50), -- 'room_discount', 'free_night', 'upgrade', 'amenity'
    redemption_value DECIMAL(10,2), -- Monetary value of redemption
    
    -- Validity
    earned_date DATE,
    expiry_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'redeemed', 'expired', 'reversed'
    
    -- Notes
    description TEXT,
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    reversed_at TIMESTAMP,
    reversed_by UUID REFERENCES users(id),
    reversal_reason TEXT
);

-- Indexes
CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_date ON loyalty_transactions(created_at);
CREATE INDEX idx_loyalty_transactions_type ON loyalty_transactions(transaction_type);
CREATE INDEX idx_loyalty_transactions_status ON loyalty_transactions(status);
```

### 2.8 Customer Feedback

```sql
CREATE TABLE customer_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id),
    
    -- Feedback Type
    feedback_type VARCHAR(50), -- 'stay', 'service', 'facility', 'general'
    channel VARCHAR(50), -- 'survey', 'email', 'in_person', 'online_review'
    
    -- Ratings (1-5 scale)
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    room_rating INTEGER CHECK (room_rating BETWEEN 1 AND 5),
    service_rating INTEGER CHECK (service_rating BETWEEN 1 AND 5),
    cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
    location_rating INTEGER CHECK (location_rating BETWEEN 1 AND 5),
    value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
    food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
    
    -- Net Promoter Score
    nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
    
    -- Detailed Feedback
    what_went_well TEXT,
    what_could_improve TEXT,
    specific_complaints TEXT,
    specific_compliments TEXT,
    
    -- Service Recovery
    issue_reported BOOLEAN DEFAULT false,
    issue_category VARCHAR(50),
    issue_resolved BOOLEAN DEFAULT false,
    resolution_notes TEXT,
    compensation_offered JSONB,
    
    -- Staff Mentions
    staff_mentions JSONB,
    /* [
        {
            "staff_name": "John",
            "department": "Reception",
            "mention_type": "positive",
            "comment": "Very helpful"
        }
    ] */
    
    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_completed BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    follow_up_date TIMESTAMP,
    follow_up_by UUID REFERENCES users(id),
    
    -- External Reviews
    posted_externally BOOLEAN DEFAULT false,
    external_platform VARCHAR(50), -- 'tripadvisor', 'google', 'booking.com'
    external_review_url TEXT,
    external_review_id VARCHAR(100),
    
    -- Response
    response_sent BOOLEAN DEFAULT false,
    response_content TEXT,
    response_date TIMESTAMP,
    response_by UUID REFERENCES users(id),
    
    -- Analysis
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    keywords TEXT[],
    action_items TEXT[],
    
    -- Metadata
    feedback_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_feedback_customer ON customer_feedback(customer_id);
CREATE INDEX idx_customer_feedback_booking ON customer_feedback(booking_id);
CREATE INDEX idx_customer_feedback_date ON customer_feedback(feedback_date);
CREATE INDEX idx_customer_feedback_rating ON customer_feedback(overall_rating);
CREATE INDEX idx_customer_feedback_nps ON customer_feedback(nps_score);
```

---

## 3. API Endpoints

### 3.1 Customer Management

#### POST /api/customers
Create a new customer profile.

**Request Body:**
```json
{
  "title": "Mr",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@email.com",
  "phone": "+84901234567",
  "date_of_birth": "1985-06-15",
  "nationality": "USA",
  "id_type": "passport",
  "id_number": "A12345678",
  "address": {
    "line1": "123 Main Street",
    "city": "New York",
    "country": "USA",
    "postal_code": "10001"
  },
  "preferences": {
    "room": ["high_floor", "quiet"],
    "bed": "king",
    "dietary": ["vegetarian"]
  },
  "marketing_consent": true,
  "customer_type": "individual",
  "customer_source": "website"
}
```

**Business Logic:**
```python
def create_customer(customer_data):
    # Check for duplicates
    existing = find_customer_by_email_or_phone(
        customer_data.get('email'),
        customer_data.get('phone')
    )
    
    if existing:
        # Merge or return existing
        if should_merge(existing, customer_data):
            return merge_customer_profiles(existing, customer_data)
        else:
            raise DuplicateCustomerError("Customer already exists")
    
    # Generate customer code
    customer_code = generate_customer_code()
    
    # Calculate profile completeness
    completeness = calculate_profile_completeness(customer_data)
    
    # Create customer
    customer = Customer.create({
        **customer_data,
        'customer_code': customer_code,
        'profile_completeness': completeness,
        'acquisition_date': date.today()
    })
    
    # Create preferences if provided
    if customer_data.get('preferences'):
        create_customer_preferences(customer.id, customer_data['preferences'])
    
    # Send welcome email if consent given
    if customer_data.get('marketing_consent'):
        send_welcome_email(customer)
    
    # Trigger CRM integration
    sync_to_crm(customer)
    
    return customer
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "customer_code": "C20240001",
  "full_name": "John Doe",
  "email": "john.doe@email.com",
  "profile_completeness": 75,
  "vip_status": "none",
  "total_stays": 0,
  "created_at": "2024-01-20T10:30:00Z"
}
```

#### GET /api/customers
Search and list customers with advanced filtering.

**Query Parameters:**
- `search` (string): Search in name, email, phone, company
- `customer_type` (string): Filter by type
- `vip_status` (string): Filter by VIP status
- `has_stayed` (boolean): Only customers with stays
- `last_stay_from` (date): Last stay date from
- `last_stay_to` (date): Last stay date to
- `min_spent` (decimal): Minimum total spent
- `tags` (array): Filter by tags
- `include_blacklisted` (boolean): Include blacklisted customers
- `page` (integer): Page number
- `limit` (integer): Items per page
- `sort_by` (string): Sort field
- `order` (string): Sort order

**Response:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "customer_code": "C20240001",
      "full_name": "John Doe",
      "email": "john.doe@email.com",
      "phone": "+84901234567",
      "customer_type": "individual",
      "vip_status": "gold",
      "total_stays": 15,
      "total_spent": 45000000,
      "last_stay_date": "2024-01-15",
      "days_since_last_stay": 5,
      "loyalty_points": 4500,
      "tags": ["frequent_traveler", "vip"],
      "profile_completeness": 85
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  },
  "summary": {
    "total_customers": 150,
    "vip_customers": 25,
    "returning_customers": 80,
    "new_customers": 70
  }
}
```

#### GET /api/customers/{id}
Get detailed customer profile.

**Response:**
```json
{
  "customer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "customer_code": "C20240001",
    "personal_info": {
      "title": "Mr",
      "first_name": "John",
      "middle_name": "Michael",
      "last_name": "Doe",
      "display_name": "John Doe",
      "date_of_birth": "1985-06-15",
      "age": 38,
      "gender": "male",
      "nationality": "USA"
    },
    "contact_info": {
      "email": "john.doe@email.com",
      "email_verified": true,
      "phone": "+84901234567",
      "phone_verified": true,
      "whatsapp": "+84901234567",
      "address": {
        "line1": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "country": "USA",
        "postal_code": "10001"
      }
    },
    "identification": {
      "type": "passport",
      "number": "A12345678",
      "expiry_date": "2028-06-15",
      "issuing_country": "USA"
    },
    "statistics": {
      "first_stay": "2022-03-15",
      "last_stay": "2024-01-15",
      "total_stays": 15,
      "total_nights": 45,
      "total_spent": 45000000,
      "average_spent_per_stay": 3000000,
      "average_stay_length": 3.0,
      "cancellation_rate": 6.7,
      "no_shows": 0
    },
    "loyalty": {
      "is_member": true,
      "number": "LY123456",
      "tier": "gold",
      "points": 4500,
      "lifetime_points": 12000,
      "tier_progress": {
        "current": "gold",
        "next": "platinum",
        "points_to_next": 3500
      }
    },
    "preferences": {
      "room": {
        "location": ["high_floor", "quiet"],
        "bed_type": "king",
        "view": "sea",
        "temperature": "cool"
      },
      "dietary": ["vegetarian", "no_nuts"],
      "amenities": ["extra_towels", "bathrobes"],
      "services": {
        "housekeeping": "morning",
        "newspaper": "NYT",
        "wake_up_call": "07:00"
      }
    },
    "relationships": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440000",
        "name": "Jane Doe",
        "relationship": "spouse",
        "is_customer": true,
        "customer_id": "770e8400-e29b-41d4-a716-446655440000"
      }
    ],
    "recent_stays": [
      {
        "booking_id": "880e8400-e29b-41d4-a716-446655440000",
        "check_in": "2024-01-10",
        "check_out": "2024-01-15",
        "room": "201",
        "amount": 7500000,
        "satisfaction_score": 9
      }
    ],
    "tags": ["vip", "frequent_traveler", "business"],
    "internal_notes": "Prefers early check-in when possible",
    "marketing": {
      "consent": true,
      "email_opt_in": true,
      "sms_opt_in": false,
      "last_campaign": "2024-01-01"
    }
  }
}
```

#### PUT /api/customers/{id}
Update customer profile.

**Request Body:**
```json
{
  "phone": "+84909876543",
  "address": {
    "line1": "456 New Street",
    "city": "Ho Chi Minh City",
    "country": "Vietnam"
  },
  "vip_status": "platinum",
  "preferences": {
    "room": ["high_floor", "corner_room"],
    "dietary": ["vegan"]
  },
  "tags": ["vip", "long_stay", "corporate"]
}
```

**Business Logic:**
```python
def update_customer(customer_id, updates):
    customer = get_customer(customer_id)
    
    # Track changes for audit
    changes = track_changes(customer, updates)
    
    # Update customer
    customer.update(updates)
    
    # Recalculate profile completeness
    customer.profile_completeness = calculate_profile_completeness(customer)
    
    # Update preferences if changed
    if 'preferences' in updates:
        update_customer_preferences(customer_id, updates['preferences'])
    
    # Check for VIP status changes
    if 'vip_status' in updates and updates['vip_status'] != customer.vip_status:
        handle_vip_status_change(customer, updates['vip_status'])
    
    # Log changes
    log_customer_changes(customer_id, changes)
    
    # Sync with external systems
    sync_customer_updates(customer)
    
    return customer
```

### 3.2 Customer Preferences

#### GET /api/customers/{id}/preferences
Get customer preferences.

**Response:**
```json
{
  "preferences": {
    "room": {
      "location": ["high_floor", "away_from_elevator"],
      "type_preference": "Deluxe Ocean View",
      "bed_type": "king",
      "bed_firmness": "medium",
      "pillow_type": "memory_foam",
      "pillow_count": 4,
      "temperature": "cool",
      "floor": "high",
      "view": "sea"
    },
    "amenities": {
      "minibar": {
        "stock": ["water", "juice", "beer"],
        "remove": ["peanuts"],
        "extra": ["diet_coke"]
      },
      "bathroom": ["bathrobes", "slippers", "extra_towels"],
      "room": ["iron", "coffee_maker"]
    },
    "services": {
      "housekeeping_time": "morning",
      "turndown_service": true,
      "wake_up_call": "07:00",
      "do_not_disturb": [
        {"from": "14:00", "to": "16:00"}
      ],
      "newspaper": "Financial Times",
      "newspaper_language": "en"
    },
    "dietary": {
      "restrictions": ["vegetarian", "gluten_free"],
      "allergies": ["peanuts", "shellfish"],
      "breakfast": {
        "type": "continental",
        "time": "07:30",
        "location": "room"
      },
      "beverages": ["coffee", "green_tea", "red_wine"]
    },
    "accessibility": {
      "required": false,
      "mobility_assistance": null,
      "hearing_assistance": false,
      "visual_assistance": false
    },
    "business": {
      "work_desk": true,
      "high_speed_internet": true,
      "printer_access": false,
      "meeting_room": "small_quiet"
    },
    "recreation": {
      "gym_access": true,
      "spa_interest": true,
      "pool_access": true,
      "activities": ["yoga", "swimming"]
    },
    "communication": {
      "preferred_method": "email",
      "preferred_time": "morning",
      "language": "en",
      "frequency": "important_only"
    }
  }
}
```

#### PUT /api/customers/{id}/preferences
Update customer preferences.

**Request Body:**
```json
{
  "category": "room",
  "preferences": {
    "bed_type": "twin",
    "floor": "middle",
    "view": "garden",
    "temperature": "warm"
  }
}
```

### 3.3 Customer Documents

#### POST /api/customers/{id}/documents
Upload customer document.

**Request:** Multipart form data
- `document_type` (string): Type of document
- `document_number` (string): Document number
- `issue_date` (date): Issue date
- `expiry_date` (date): Expiry date
- `file` (file): Document file

**Process:**
```python
def upload_customer_document(customer_id, document_data, file):
    # Validate file
    if not validate_file_type(file):
        raise ValidationError("Invalid file type")
    
    # Encrypt sensitive documents
    if document_data['document_type'] in SENSITIVE_DOCUMENTS:
        encrypted_file = encrypt_file(file)
        encryption_key_id = store_encryption_key()
    else:
        encrypted_file = file
        encryption_key_id = None
    
    # Upload to R2
    file_url = upload_to_r2(
        f"customers/{customer_id}/documents/{document_data['document_type']}/{file.name}",
        encrypted_file
    )
    
    # Create thumbnail if image
    thumbnail_url = None
    if is_image(file):
        thumbnail = create_thumbnail(file)
        thumbnail_url = upload_to_r2(
            f"customers/{customer_id}/documents/thumbnails/{file.name}",
            thumbnail
        )
    
    # Store document record
    document = CustomerDocument.create({
        'customer_id': customer_id,
        'document_type': document_data['document_type'],
        'document_number': document_data.get('document_number'),
        'issue_date': document_data.get('issue_date'),
        'expiry_date': document_data.get('expiry_date'),
        'file_url': file_url,
        'file_thumbnail': thumbnail_url,
        'file_size': file.size,
        'file_type': get_file_extension(file),
        'is_encrypted': encryption_key_id is not None,
        'encryption_key_id': encryption_key_id
    })
    
    # Set retention policy
    set_document_retention(document)
    
    return document
```

#### GET /api/customers/{id}/documents
List customer documents.

**Response:**
```json
{
  "documents": [
    {
      "id": "990e8400-e29b-41d4-a716-446655440000",
      "type": "passport",
      "number": "A12345678",
      "issue_date": "2018-06-15",
      "expiry_date": "2028-06-15",
      "status": "active",
      "is_verified": true,
      "file_url": "https://secure-url.com/document.pdf",
      "thumbnail_url": "https://secure-url.com/thumb.jpg",
      "uploaded_at": "2024-01-20T10:30:00Z"
    },
    {
      "id": "aa0e8400-e29b-41d4-a716-446655440000",
      "type": "visa",
      "number": "VN123456",
      "issue_date": "2024-01-01",
      "expiry_date": "2024-12-31",
      "status": "active",
      "is_verified": false,
      "file_url": "https://secure-url.com/visa.pdf"
    }
  ]
}
```

### 3.4 Stay History

#### GET /api/customers/{id}/stays
Get customer stay history.

**Query Parameters:**
- `from_date` (date): Filter from date
- `to_date` (date): Filter to date
- `include_cancelled` (boolean): Include cancelled bookings

**Response:**
```json
{
  "stays": [
    {
      "id": "bb0e8400-e29b-41d4-a716-446655440000",
      "booking_id": "880e8400-e29b-41d4-a716-446655440000",
      "check_in": "2024-01-10",
      "check_out": "2024-01-15",
      "nights": 5,
      "room_type": "Deluxe Ocean View",
      "room_number": "201",
      "rate_type": "corporate",
      "room_rate": 1500000,
      "total_amount": 7500000,
      "purpose": "business",
      "satisfaction_score": 9,
      "feedback": {
        "overall_rating": 5,
        "would_recommend": true,
        "comments": "Excellent service, very comfortable stay"
      },
      "preferences_noted": {
        "room": ["high_floor", "quiet"],
        "fulfilled": true
      },
      "special_requests": [
        {
          "request": "Early check-in",
          "fulfilled": true
        }
      ]
    }
  ],
  "statistics": {
    "total_stays": 15,
    "total_nights": 45,
    "total_spent": 45000000,
    "average_satisfaction": 8.5,
    "favorite_room_type": "Deluxe Ocean View",
    "most_common_purpose": "business",
    "seasonality": {
      "peak_month": "December",
      "low_month": "June"
    }
  }
}
```

### 3.5 Loyalty Program

#### GET /api/customers/{id}/loyalty
Get loyalty program details.

**Response:**
```json
{
  "membership": {
    "number": "LY123456",
    "tier": "gold",
    "join_date": "2022-03-15",
    "expiry_date": "2025-03-15",
    "status": "active"
  },
  "points": {
    "current_balance": 4500,
    "lifetime_earned": 12000,
    "lifetime_redeemed": 7500,
    "expiring_soon": {
      "amount": 500,
      "expiry_date": "2024-03-31"
    }
  },
  "tier_progress": {
    "current_tier": "gold",
    "next_tier": "platinum",
    "requirements": {
      "points_needed": 3500,
      "stays_needed": 5,
      "nights_needed": 15
    },
    "progress": {
      "points": 4500,
      "stays": 15,
      "nights": 45
    }
  },
  "benefits": [
    "10% discount on room rates",
    "Free breakfast",
    "Late checkout until 2 PM",
    "Room upgrade (subject to availability)",
    "Welcome amenity"
  ],
  "recent_transactions": [
    {
      "date": "2024-01-15",
      "type": "earn",
      "points": 750,
      "description": "Stay - Booking #BK20240115001",
      "balance_after": 4500
    },
    {
      "date": "2024-01-01",
      "type": "redeem",
      "points": -1000,
      "description": "Room discount",
      "balance_after": 3750
    }
  ]
}
```

#### POST /api/customers/{id}/loyalty/transactions
Add loyalty transaction.

**Request Body:**
```json
{
  "type": "earn",
  "points": 500,
  "source": "referral",
  "description": "Referral bonus - John Smith",
  "multiplier": 2.0,
  "expiry_date": "2025-01-31"
}
```

### 3.6 Customer Feedback

#### POST /api/customers/{id}/feedback
Submit customer feedback.

**Request Body:**
```json
{
  "booking_id": "880e8400-e29b-41d4-a716-446655440000",
  "feedback_type": "stay",
  "overall_rating": 5,
  "ratings": {
    "room": 5,
    "service": 5,
    "cleanliness": 5,
    "location": 4,
    "value": 4,
    "food": 5
  },
  "nps_score": 9,
  "what_went_well": "Staff was amazing, room was perfect",
  "what_could_improve": "Pool area could be larger",
  "staff_mentions": [
    {
      "staff_name": "Sarah",
      "department": "Reception",
      "mention_type": "positive",
      "comment": "Very helpful during check-in"
    }
  ],
  "would_recommend": true,
  "can_use_for_marketing": true
}
```

#### GET /api/customers/{id}/feedback
Get customer feedback history.

**Response:**
```json
{
  "feedback": [
    {
      "id": "cc0e8400-e29b-41d4-a716-446655440000",
      "booking_id": "880e8400-e29b-41d4-a716-446655440000",
      "date": "2024-01-15",
      "overall_rating": 5,
      "nps_score": 9,
      "sentiment": "positive",
      "summary": "Excellent stay with minor suggestions",
      "response_sent": true,
      "response": "Thank you for your wonderful feedback...",
      "action_items": [
        "Share positive feedback with Sarah",
        "Consider pool expansion in renovation plans"
      ]
    }
  ],
  "statistics": {
    "average_rating": 4.5,
    "average_nps": 8.2,
    "total_feedback": 12,
    "response_rate": 100,
    "sentiment_breakdown": {
      "positive": 10,
      "neutral": 2,
      "negative": 0
    }
  }
}
```

### 3.7 Customer Relationships

#### POST /api/customers/{id}/relationships
Add customer relationship.

**Request Body:**
```json
{
  "related_customer_id": "770e8400-e29b-41d4-a716-446655440000",
  "relationship_type": "spouse",
  "is_primary": true,
  "can_make_bookings": true,
  "share_preferences": true,
  "same_room_preference": true
}
```

#### GET /api/customers/{id}/relationships
Get customer relationships.

**Response:**
```json
{
  "relationships": [
    {
      "id": "dd0e8400-e29b-41d4-a716-446655440000",
      "customer": {
        "id": "770e8400-e29b-41d4-a716-446655440000",
        "name": "Jane Doe",
        "email": "jane.doe@email.com",
        "customer_code": "C20240002"
      },
      "relationship_type": "spouse",
      "is_primary": true,
      "can_make_bookings": true,
      "share_preferences": true
    },
    {
      "id": "ee0e8400-e29b-41d4-a716-446655440000",
      "customer": {
        "id": "990e8400-e29b-41d4-a716-446655440000",
        "name": "Jack Doe",
        "customer_code": "C20240003"
      },
      "relationship_type": "child",
      "is_primary": false,
      "can_make_bookings": false
    }
  ],
  "family_preferences": {
    "connecting_rooms": true,
    "same_floor": true,
    "family_dining": true
  }
}
```

---

## 4. Business Logic

### 4.1 Customer Segmentation

```python
def segment_customer(customer):
    """
    Automatically segment customers based on behavior and value.
    """
    
    segments = []
    
    # Value-based segmentation
    if customer.total_spent >= 100000000:  # 100M VND
        segments.append('high_value')
    elif customer.total_spent >= 50000000:  # 50M VND
        segments.append('medium_value')
    else:
        segments.append('low_value')
    
    # Frequency-based segmentation
    if customer.total_stays >= 10:
        segments.append('frequent_guest')
    elif customer.total_stays >= 5:
        segments.append('regular_guest')
    elif customer.total_stays >= 2:
        segments.append('returning_guest')
    else:
        segments.append('new_guest')
    
    # Recency-based segmentation
    if customer.days_since_last_stay:
        if customer.days_since_last_stay <= 30:
            segments.append('recent_guest')
        elif customer.days_since_last_stay <= 90:
            segments.append('active_guest')
        elif customer.days_since_last_stay <= 365:
            segments.append('lapsed_guest')
        else:
            segments.append('dormant_guest')
    
    # Purpose-based segmentation
    stay_purposes = get_stay_purposes(customer.id)
    if stay_purposes:
        primary_purpose = max(stay_purposes, key=stay_purposes.count)
        segments.append(f'{primary_purpose}_traveler')
    
    # Behavioral segmentation
    if customer.average_stay_length >= 7:
        segments.append('long_stay')
    
    if customer.no_show_count > 0 or customer.total_cancellations > 2:
        segments.append('risky')
    
    if has_complaints(customer.id):
        segments.append('requires_attention')
    
    # Loyalty segmentation
    if customer.loyalty_member:
        segments.append(f'loyalty_{customer.loyalty_tier}')
    
    return segments
```

### 4.2 VIP Status Management

```python
def evaluate_vip_status(customer):
    """
    Evaluate and update customer VIP status based on criteria.
    """
    
    current_status = customer.vip_status
    new_status = 'none'
    
    # Define VIP criteria
    vip_criteria = {
        'diamond': {
            'total_spent': 200000000,  # 200M VND
            'total_stays': 20,
            'loyalty_points': 20000
        },
        'platinum': {
            'total_spent': 100000000,  # 100M VND
            'total_stays': 15,
            'loyalty_points': 10000
        },
        'gold': {
            'total_spent': 50000000,  # 50M VND
            'total_stays': 10,
            'loyalty_points': 5000
        },
        'silver': {
            'total_spent': 20000000,  # 20M VND
            'total_stays': 5,
            'loyalty_points': 2000
        }
    }
    
    # Check eligibility for each tier
    for tier, criteria in vip_criteria.items():
        if (customer.total_spent >= criteria['total_spent'] or
            customer.total_stays >= criteria['total_stays'] or
            customer.loyalty_points >= criteria['loyalty_points']):
            new_status = tier
            break
    
    # Handle status change
    if new_status != current_status:
        # Update status
        customer.vip_status = new_status
        customer.vip_status_expiry = date.today() + timedelta(days=365)
        
        # Log change
        log_vip_status_change(customer, current_status, new_status)
        
        # Send notification
        if new_status != 'none':
            send_vip_upgrade_notification(customer, new_status)
            
            # Apply benefits
            apply_vip_benefits(customer, new_status)
        elif current_status != 'none':
            send_vip_downgrade_notification(customer, current_status, new_status)
    
    return new_status
```

### 4.3 Preference Learning

```python
def learn_customer_preferences(customer_id, booking_id):
    """
    Learn and update customer preferences from their stay.
    """
    
    booking = get_booking(booking_id)
    stay_data = get_stay_data(booking_id)
    
    # Get existing preferences
    preferences = get_customer_preferences(customer_id)
    
    # Learn room preferences
    if stay_data.satisfaction_score >= 8:
        # High satisfaction - learn positive preferences
        if booking.room:
            update_preference(preferences, 'room_type', booking.room.type)
            update_preference(preferences, 'floor', booking.room.floor)
            update_preference(preferences, 'view', booking.room.view_type)
    
    # Learn from special requests
    if booking.special_requests:
        fulfilled_requests = get_fulfilled_requests(booking_id)
        for request in fulfilled_requests:
            add_to_preference_history(customer_id, request)
    
    # Learn from consumption patterns
    minibar_consumption = get_minibar_consumption(booking_id)
    if minibar_consumption:
        update_minibar_preferences(customer_id, minibar_consumption)
    
    # Learn from service usage
    services_used = get_services_used(booking_id)
    for service in services_used:
        increment_service_preference(customer_id, service)
    
    # Learn from feedback
    if stay_data.feedback:
        process_feedback_for_preferences(customer_id, stay_data.feedback)
    
    # Update preference confidence scores
    update_preference_confidence(customer_id)
    
    return preferences
```

### 4.4 Duplicate Detection and Merging

```python
def find_duplicate_customers(customer_data):
    """
    Find potential duplicate customer profiles.
    """
    
    duplicates = []
    
    # Check by email
    if customer_data.get('email'):
        email_matches = Customer.find_by_email(customer_data['email'])
        duplicates.extend(email_matches)
    
    # Check by phone
    if customer_data.get('phone'):
        phone_matches = Customer.find_by_phone(
            normalize_phone(customer_data['phone'])
        )
        duplicates.extend(phone_matches)
    
    # Check by name and DOB
    if customer_data.get('first_name') and customer_data.get('last_name'):
        name_matches = Customer.find_by_name(
            customer_data['first_name'],
            customer_data['last_name'],
            customer_data.get('date_of_birth')
        )
        duplicates.extend(name_matches)
    
    # Check by ID document
    if customer_data.get('id_number'):
        id_matches = Customer.find_by_id_document(
            customer_data['id_type'],
            customer_data['id_number']
        )
        duplicates.extend(id_matches)
    
    # Score and rank duplicates
    scored_duplicates = []
    for dup in set(duplicates):
        score = calculate_duplicate_score(customer_data, dup)
        if score > 0.7:  # 70% similarity threshold
            scored_duplicates.append((dup, score))
    
    return sorted(scored_duplicates, key=lambda x: x[1], reverse=True)


def merge_customer_profiles(primary_id, secondary_id):
    """
    Merge two customer profiles.
    """
    
    primary = get_customer(primary_id)
    secondary = get_customer(secondary_id)
    
    # Merge basic information (keep primary, fill gaps from secondary)
    merge_basic_info(primary, secondary)
    
    # Merge statistics
    primary.total_stays += secondary.total_stays
    primary.total_nights += secondary.total_nights
    primary.total_spent += secondary.total_spent
    primary.loyalty_points += secondary.loyalty_points
    
    # Merge stay history
    transfer_stay_history(secondary_id, primary_id)
    
    # Merge preferences (combine and deduplicate)
    merge_preferences(primary_id, secondary_id)
    
    # Merge relationships
    transfer_relationships(secondary_id, primary_id)
    
    # Merge documents
    transfer_documents(secondary_id, primary_id)
    
    # Merge feedback
    transfer_feedback(secondary_id, primary_id)
    
    # Update bookings
    update_bookings_customer(secondary_id, primary_id)
    
    # Mark secondary as merged
    secondary.status = 'merged'
    secondary.merged_into = primary_id
    secondary.merged_date = datetime.now()
    
    # Recalculate segments and status
    primary.customer_segment = segment_customer(primary)
    primary.vip_status = evaluate_vip_status(primary)
    
    # Log merge
    log_customer_merge(primary_id, secondary_id)
    
    return primary
```

### 4.5 GDPR Compliance

```python
def handle_data_deletion_request(customer_id):
    """
    Handle GDPR data deletion request.
    """
    
    customer = get_customer(customer_id)
    
    # Check if deletion is allowed
    if has_active_bookings(customer_id):
        raise ValidationError("Cannot delete customer with active bookings")
    
    if has_outstanding_balance(customer_id):
        raise ValidationError("Cannot delete customer with outstanding balance")
    
    # Anonymize personal data
    customer.first_name = "DELETED"
    customer.last_name = "DELETED"
    customer.email = f"deleted_{customer_id}@example.com"
    customer.phone = "000000000"
    customer.address_line1 = "DELETED"
    customer.date_of_birth = None
    customer.id_number = "DELETED"
    
    # Delete documents
    delete_customer_documents(customer_id)
    
    # Delete preferences
    delete_customer_preferences(customer_id)
    
    # Anonymize feedback
    anonymize_customer_feedback(customer_id)
    
    # Keep statistical data for business analytics
    # but disconnect from personal identity
    
    customer.anonymized = True
    customer.deletion_requested_date = datetime.now()
    customer.save()
    
    # Log deletion
    log_gdpr_deletion(customer_id)
    
    # Send confirmation
    send_deletion_confirmation(customer.email)
    
    return True


def export_customer_data(customer_id):
    """
    Export all customer data for GDPR data portability.
    """
    
    data = {
        'personal_information': get_customer(customer_id).to_dict(),
        'preferences': get_customer_preferences(customer_id),
        'stay_history': get_stay_history(customer_id),
        'bookings': get_all_bookings(customer_id),
        'feedback': get_all_feedback(customer_id),
        'loyalty_transactions': get_loyalty_transactions(customer_id),
        'documents': list_customer_documents(customer_id),
        'communications': get_customer_communications(customer_id),
        'relationships': get_customer_relationships(customer_id)
    }
    
    # Create PDF report
    pdf = generate_customer_data_pdf(data)
    
    # Create JSON export
    json_export = json.dumps(data, indent=2, default=str)
    
    return {
        'pdf': pdf,
        'json': json_export
    }
```

---

## 5. Frontend Components

### 5.1 TypeScript Interfaces

```typescript
// Customer interfaces
interface Customer {
  id: string;
  customerCode: string;
  customerType: CustomerType;
  
  // Personal info
  title?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName: string;
  displayName?: string;
  dateOfBirth?: Date;
  age?: number;
  gender?: Gender;
  nationality?: string;
  
  // Contact
  email?: string;
  emailVerified: boolean;
  phone?: string;
  phoneVerified: boolean;
  whatsappNumber?: string;
  
  // Address
  address?: Address;
  
  // Identification
  idType?: string;
  idNumber?: string;
  idExpiryDate?: Date;
  
  // Categories
  vipStatus: VIPStatus;
  customerSegment?: string;
  tags: string[];
  
  // Loyalty
  loyaltyMember: boolean;
  loyaltyNumber?: string;
  loyaltyTier?: LoyaltyTier;
  loyaltyPoints: number;
  
  // Statistics
  firstStayDate?: Date;
  lastStayDate?: Date;
  totalStays: number;
  totalNights: number;
  totalSpent: number;
  averageSpentPerStay: number;
  daysSinceLastStay?: number;
  
  // Preferences summary
  preferencesSummary?: PreferencesSummary;
  
  // Marketing
  marketingConsent: boolean;
  emailOptIn: boolean;
  smsOptIn: boolean;
  
  // Status
  isBlacklisted: boolean;
  blacklistReason?: string;
  profileCompleteness: number;
  profileVerified: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

enum CustomerType {
  INDIVIDUAL = 'individual',
  CORPORATE = 'corporate',
  TRAVEL_AGENT = 'travel_agent',
  GOVERNMENT = 'government'
}

enum VIPStatus {
  NONE = 'none',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond'
}

enum LoyaltyTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

interface Address {
  line1?: string;
  line2?: string;
  city?: string;
  stateProvince?: string;
  postalCode?: string;
  country?: string;
}

interface CustomerPreferences {
  room?: RoomPreferences;
  amenities?: AmenityPreferences;
  services?: ServicePreferences;
  dietary?: DietaryPreferences;
  accessibility?: AccessibilityPreferences;
  business?: BusinessPreferences;
  recreation?: RecreationPreferences;
  communication?: CommunicationPreferences;
}

interface RoomPreferences {
  location?: string[];
  bedType?: string;
  bedFirmness?: string;
  pillowType?: string;
  temperature?: string;
  floor?: string;
  view?: string;
}

interface DietaryPreferences {
  restrictions?: string[];
  allergies?: string[];
  breakfast?: BreakfastPreference;
  beverages?: string[];
}

interface CustomerRelationship {
  id: string;
  customerId: string;
  relatedCustomer: {
    id: string;
    name: string;
    customerCode: string;
  };
  relationshipType: string;
  isPrimary: boolean;
  canMakeBookings: boolean;
  sharePreferences: boolean;
}

interface CustomerStay {
  id: string;
  bookingId: string;
  checkIn: Date;
  checkOut: Date;
  nights: number;
  roomType: string;
  roomNumber: string;
  totalAmount: number;
  satisfactionScore?: number;
  purpose?: string;
  feedback?: StayFeedback;
}