// Extended translations for missing modules

export const extendedTranslations = {
  en: {
    // Navigation
    navigation: {
      dashboard: 'Dashboard',
      rooms: 'Rooms',
      roomTypes: 'Room Types',
      roomAllocation: 'Room Allocation',
      bookings: 'Bookings',
      customers: 'Customers',
      inventory: 'Inventory',
      billing: 'Billing',
      pos: 'POS',
      reports: 'Reports',
      userManagement: 'User Management',
      bankAccounts: 'Bank Accounts',
      exchangeRates: 'Exchange Rates',
      settings: 'Settings',
      logout: 'Logout',
      profile: 'Profile'
    },

    // Authentication
    auth: {
      login: 'Login',
      logout: 'Logout',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      forgotPassword: 'Forgot Password?',
      resetPassword: 'Reset Password',
      rememberMe: 'Remember Me',
      loginSuccess: 'Login successful',
      loginFailed: 'Login failed',
      invalidCredentials: 'Invalid email or password',
      sessionExpired: 'Session expired. Please login again',
      unauthorized: 'Unauthorized access',
      welcomeBack: 'Welcome Back',
      hotelManagementSystem: 'Hotel Management System'
    },

    // Dashboard
    dashboard: {
      title: 'Dashboard',
      overview: 'Overview',
      welcomeMessage: 'Welcome to Hotel Management System',
      todayStatistics: "Today's Statistics",
      monthlyStatistics: 'Monthly Statistics',
      
      // KPI Cards
      totalRooms: 'Total Rooms',
      occupiedRooms: 'Occupied Rooms',
      availableRooms: 'Available Rooms',
      occupancyRate: 'Occupancy Rate',
      todayCheckIns: "Today's Check-ins",
      todayCheckOuts: "Today's Check-outs",
      totalGuests: 'Total Guests',
      totalCustomers: 'Total Customers',
      todayRevenue: "Today's Revenue",
      monthRevenue: "Month's Revenue",
      pendingPayments: 'Pending Payments',
      averageRoomRate: 'Average Room Rate',
      
      // Detailed descriptions
      currentOccupancy: 'Current occupancy',
      totalRevenueToday: 'Total revenue today',
      revenueThisMonth: 'Revenue this month',
      arrivalsScheduled: 'Arrivals scheduled',
      departuresScheduled: 'Departures scheduled',
      registeredCustomers: 'Registered customers',
      outstandingBalance: 'Outstanding balance',
      
      // Recent Activity
      recentActivity: 'Recent Activity',
      latestBookingsAndCheckIns: 'Latest bookings and check-ins',
      newBookingReceived: 'New booking received',
      checkInCompleted: 'Check-in completed',
      paymentReceived: 'Payment received',
      
      // Quick Actions detailed
      quickActionsDescription: 'Common tasks and operations',
      createReservation: 'Create a reservation',
      processArrival: 'Process arrival',
      createBilling: 'Create billing',
      analyticsInsights: 'Analytics & insights',
      
      // Charts
      revenueChart: 'Revenue Overview',
      occupancyChart: 'Occupancy Trends',
      bookingSourceChart: 'Booking Sources',
      roomStatusChart: 'Room Status Distribution',
      
      // Quick Actions
      quickActions: 'Quick Actions',
      newBooking: 'New Booking',
      checkIn: 'Check-in',
      checkOut: 'Check-out',
      viewReports: 'View Reports',
      checkInGuest: 'Check-in Guest',
      generateInvoice: 'Generate Invoice'
    },

    // Customers
    customers: {
      title: 'Customer Management',
      subtitle: 'Manage customer profiles and history',
      customerList: 'Customer List',
      newCustomer: 'New Customer',
      editCustomer: 'Edit Customer',
      deleteCustomer: 'Delete Customer',
      customerDetails: 'Customer Details',
      searchCustomers: 'Search customers...',
      
      // Fields
      customerId: 'Customer ID',
      fullName: 'Full Name',
      firstName: 'First Name',
      lastName: 'Last Name',
      email: 'Email',
      phone: 'Phone',
      alternatePhone: 'Alternate Phone',
      dateOfBirth: 'Date of Birth',
      nationality: 'Nationality',
      idType: 'ID Type',
      idNumber: 'ID Number',
      address: 'Address',
      city: 'City',
      state: 'State',
      country: 'Country',
      postalCode: 'Postal Code',
      
      // Preferences
      preferences: 'Preferences',
      roomPreferences: 'Room Preferences',
      dietaryRestrictions: 'Dietary Restrictions',
      specialRequests: 'Special Requests',
      languagePreference: 'Language Preference',
      communicationPreference: 'Communication Preference',
      
      // History
      bookingHistory: 'Booking History',
      paymentHistory: 'Payment History',
      totalBookings: 'Total Bookings',
      totalSpent: 'Total Spent',
      lastVisit: 'Last Visit',
      memberSince: 'Member Since',
      loyaltyPoints: 'Loyalty Points',
      vipStatus: 'VIP Status',
      
      // Status
      active: 'Active',
      inactive: 'Inactive',
      blacklisted: 'Blacklisted',
      vip: 'VIP',
      regular: 'Regular'
    },

    // Inventory
    inventory: {
      title: 'Inventory Management',
      enhancedTitle: 'Enhanced Inventory System',
      subtitle: 'Manage stock and supplies',
      enhancedSubtitle: 'Comprehensive inventory management with advanced features',
      enhancedFeatures: 'Enhanced Features',
      dashboard: 'Inventory Dashboard',
      overview: 'Overview',
      analyticsInsights: 'Analytics & insights',
      products: 'Products',
      categories: 'Categories',
      suppliers: 'Suppliers',
      purchaseOrders: 'Purchase Orders',
      stockMovements: 'Stock Movements',
      stockValue: 'Stock Value',
      lowStockItems: 'Low Stock Items',
      pendingApproval: 'Pending approval',
      recipesBOM: 'Recipes & BOM',
      activeRecipes: 'Active recipes',
      reports: 'Reports',
      analytics: 'Analytics',
      recipeManagement: 'Recipe & BOM Management',
      recipeDescription: 'Create and manage recipes with bill of materials for food production and inventory consumption tracking.',
      createRecipe: 'Create Recipe',
      inventoryDashboard: 'Inventory Dashboard',
      dashboardOverview: 'Overview of your inventory management system',
      recentMovements: 'Recent Movements',
      topProducts: 'Top Products',
      byCategory: 'By Category',
      
      // Products
      productList: 'Product List',
      newProduct: 'New Product',
      editProduct: 'Edit Product',
      deleteProduct: 'Delete Product',
      productName: 'Product Name',
      productCode: 'Product Code',
      category: 'Category',
      unit: 'Unit',
      currentStock: 'Current Stock',
      minimumStock: 'Minimum Stock',
      maximumStock: 'Maximum Stock',
      reorderLevel: 'Reorder Level',
      unitPrice: 'Unit Price',
      sellingPrice: 'Selling Price',
      
      // Stock
      stockIn: 'Stock In',
      stockOut: 'Stock Out',
      stockAdjustment: 'Stock Adjustment',
      stockTransfer: 'Stock Transfer',
      stockCount: 'Stock Count',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      expiryDate: 'Expiry Date',
      batchNumber: 'Batch Number',
      
      // Purchase Orders
      newPurchaseOrder: 'New Purchase Order',
      orderNumber: 'Order Number',
      orderDate: 'Order Date',
      supplier: 'Supplier',
      expectedDelivery: 'Expected Delivery',
      orderStatus: 'Order Status',
      totalItems: 'Total Items',
      totalAmount: 'Total Amount',
      pending: 'Pending',
      approved: 'Approved',
      received: 'Received',
      cancelled: 'Cancelled',
      
      // Purchase Order Management
      createOrder: 'Create Order',
      draftOrders: 'Draft Orders',
      pendingOrders: 'Pending',
      totalOrders: 'Total Orders',
      totalValue: 'Total Value',
      allOrders: 'All Orders',
      draft: 'Draft',
      submitted: 'Submitted',
      partial: 'Partial',
      submit: 'Submit',
      approve: 'Approve',
      receiveOrder: 'Receive Order',
      markAsComplete: 'Mark as Complete',
      orderDetails: 'Order Details',
      orderInformation: 'Order Information',
      supplierInformation: 'Supplier',
      contactPerson: 'Contact Person',
      email: 'Email',
      phone: 'Phone',
      orderItems: 'Order Items',
      product: 'Product',
      sku: 'SKU',
      unitCost: 'Unit Cost',
      receivedQuantity: 'Received',
      itemsToReceive: 'Items to Receive',
      specifyQuantities: 'Specify the quantities you\'re receiving for each item',
      previouslyReceived: 'Previously Received',
      remaining: 'Remaining',
      receivingNow: 'Receiving Now',
      complete: 'Complete',
      willComplete: 'Will Complete',
      completion: 'Completion',
      deliveryNotes: 'Delivery Notes',
      deliveryNotesPlaceholder: 'Add notes about the delivery condition, damages, discrepancies, etc.',
      totalItemsReceiving: 'Total Items Receiving',
      partialDelivery: 'Partial Delivery',
      orderComplete: 'Order Complete',
      notSet: 'Not set',
      manageProcurement: 'Manage procurement and stock receiving',
      
      // Tabs
      tabDashboard: 'Dashboard',
      tabProducts: 'Products',
      tabOrders: 'Orders',
      tabRecipes: 'Recipes',
      tabReports: 'Reports',
      tabAnalytics: 'Analytics',
      
      // Recipe Management
      recipeBOMManagement: 'Recipe & BOM Management',
      
      // Reports
      stockValuationReport: 'Stock Valuation Report',
      stockValuationDescription: 'Detailed inventory valuation using FIFO, LIFO, or average cost methods.',
      generateReport: 'Generate Report',
      movementAnalysis: 'Movement Analysis',
      movementAnalysisDescription: 'Track product movements, consumption patterns, and velocity.',
      purchaseAnalysis: 'Purchase Analysis',
      purchaseAnalysisDescription: 'Analyze purchase orders, supplier performance, and cost trends.',
      abcAnalysis: 'ABC Analysis',
      abcAnalysisDescription: 'Categorize inventory items based on consumption value and importance.',
      expiryBatchReport: 'Expiry & Batch Report',
      expiryBatchDescription: 'Track expiring items, batch numbers, and quality control.',
      customReports: 'Custom Reports',
      customReportsDescription: 'Create custom reports with flexible filters and data export.',
      createCustom: 'Create Custom',
      
      // Analytics
      inventoryPerformance: 'Inventory Performance',
      turnoverRatio: 'Turnover Ratio',
      stockAccuracy: 'Stock Accuracy',
      carryingCost: 'Carrying Cost',
      deadStockValue: 'Dead Stock Value',
      forecasting: 'Forecasting',
      demandForecasting: 'Demand Forecasting',
      demandForecastingDescription: 'AI-powered demand prediction based on historical data and seasonal trends.',
      reorderSuggestions: 'Reorder Suggestions',
      reorderSuggestionsDescription: 'Smart reorder recommendations to optimize stock levels and reduce costs.',
      viewForecasts: 'View Forecasts',
      
      // Dashboard specific
      totalProducts: 'Total Products',
      activeProducts: 'active products',
      turnover: 'Turnover',
      expiringSoon: 'Expiring soon',
      runningLowStock: 'are running low on stock',
      expiringSoonText: 'are expiring soon',
      recentStockMovements: 'Recent Stock Movements',
      topSellingProducts: 'Top Selling Products',
      sold: 'sold',
      revenue: 'revenue',
      stockByCategory: 'Stock by Category',
      items: 'items',
      
      // Product Management
      productManagement: 'Product Management',
      productManagementSubtitle: 'Manage your product inventory and stock levels',
      addProduct: 'Add Product',
      searchProducts: 'Search products...',
      productStatus: 'Product Status',
      allStatus: 'All Status',
      active: 'Active',
      inactive: 'Inactive',
      discontinued: 'Discontinued',
      stockStatus: 'Stock Status',
      allStock: 'All Stock',
      loadingProducts: 'Loading products',
      stock: 'Stock',
      value: 'Value',
      status: 'Status',
      actions: 'Actions',
      uncategorized: 'Uncategorized',
      min: 'Min',
      avg: 'Avg',
      adjustStock: 'Adjust Stock',
      noProductsFound: 'No products found',
      
      // Empty states
      noRecentMovements: 'No Recent Movements',
      noRecentMovementsDescription: 'Stock movements will appear here once you start receiving products or making sales.',
      noTopProducts: 'No Top Products',
      noTopProductsDescription: 'Your best-selling products will be displayed here based on sales data.',
      noCategoryData: 'No Category Data',
      noCategoryDataDescription: 'Stock categorization data will appear here once you add products with categories.'
    },

    // Billing
    billing: {
      title: 'Billing & Payments',
      subtitle: 'Manage invoices and payments',
      dashboard: 'Billing Dashboard',
      invoices: 'Invoices',
      payments: 'Payments',
      folios: 'Guest Folios',
      
      // Invoices
      invoiceList: 'Invoice List',
      newInvoice: 'New Invoice',
      editInvoice: 'Edit Invoice',
      deleteInvoice: 'Delete Invoice',
      invoiceNumber: 'Invoice Number',
      invoiceDate: 'Invoice Date',
      dueDate: 'Due Date',
      billTo: 'Bill To',
      items: 'Items',
      subtotal: 'Subtotal',
      tax: 'Tax',
      discount: 'Discount',
      total: 'Total',
      paid: 'Paid',
      balance: 'Balance',
      
      // Payment
      paymentList: 'Payment List',
      recordPayment: 'Record Payment',
      paymentMethod: 'Payment Method',
      paymentDate: 'Payment Date',
      paymentAmount: 'Payment Amount',
      reference: 'Reference',
      cash: 'Cash',
      card: 'Card',
      bankTransfer: 'Bank Transfer',
      onlinePayment: 'Online Payment',
      
      // QR Payment
      qrPayment: 'QR Payment',
      generateQR: 'Generate QR Code',
      scanToPay: 'Scan to Pay',
      paymentConfirmed: 'Payment Confirmed',
      waitingForPayment: 'Waiting for Payment',
      
      // Status
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      partiallyPaid: 'Partially Paid',
      fullPaid: 'Fully Paid',
      overdue: 'Overdue',
      cancelled: 'Cancelled'
    },

    // POS
    pos: {
      title: 'Point of Sale',
      subtitle: 'Process sales and transactions',
      terminal: 'POS Terminal',
      products: 'Products',
      cart: 'Cart',
      checkout: 'Checkout',
      
      // Shift
      shiftManagement: 'Shift Management',
      openShift: 'Open Shift',
      closeShift: 'Close Shift',
      shiftReport: 'Shift Report',
      cashFloat: 'Cash Float',
      cashCount: 'Cash Count',
      
      // Cart
      addToCart: 'Add to Cart',
      removeFromCart: 'Remove',
      clearCart: 'Clear Cart',
      quantity: 'Qty',
      unitPrice: 'Unit Price',
      totalPrice: 'Total',
      itemsInCart: 'Items in Cart',
      
      // Customer
      selectCustomer: 'Select Customer',
      walkInCustomer: 'Walk-in Customer',
      roomCharge: 'Room Charge',
      chargeToRoom: 'Charge to Room',
      
      // Payment
      paymentMethod: 'Payment Method',
      splitPayment: 'Split Payment',
      cashReceived: 'Cash Received',
      change: 'Change',
      processPayment: 'Process Payment',
      printReceipt: 'Print Receipt',
      emailReceipt: 'Email Receipt',
      
      // Categories
      allCategories: 'All Categories',
      food: 'Food',
      beverages: 'Beverages',
      snacks: 'Snacks',
      amenities: 'Amenities',
      services: 'Services',
      
      // Transaction
      transactionComplete: 'Transaction Complete',
      transactionFailed: 'Transaction Failed',
      voidTransaction: 'Void Transaction',
      refund: 'Refund'
    },

    // Reports
    reports: {
      title: 'Reports & Analytics',
      subtitle: 'View insights and generate reports',
      dashboard: 'Reports Dashboard',
      
      // Report Types
      occupancyReport: 'Occupancy Report',
      revenueReport: 'Revenue Report',
      bookingReport: 'Booking Report',
      guestReport: 'Guest Report',
      housekeepingReport: 'Housekeeping Report',
      inventoryReport: 'Inventory Report',
      financialReport: 'Financial Report',
      customReport: 'Custom Report',
      
      // Filters
      dateRange: 'Date Range',
      reportPeriod: 'Report Period',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly',
      custom: 'Custom',
      
      // Metrics
      totalRevenue: 'Total Revenue',
      averageDailyRate: 'Average Daily Rate',
      revenuePerAvailableRoom: 'RevPAR',
      occupancyPercentage: 'Occupancy %',
      totalBookings: 'Total Bookings',
      cancelledBookings: 'Cancelled Bookings',
      noShowRate: 'No-show Rate',
      
      // Actions
      generateReport: 'Generate Report',
      exportPDF: 'Export PDF',
      exportExcel: 'Export Excel',
      exportCSV: 'Export CSV',
      printReport: 'Print Report',
      emailReport: 'Email Report',
      scheduleReport: 'Schedule Report',
      saveReport: 'Save Report'
    },

    // Room Allocation
    roomAllocation: {
      title: 'Room Allocation',
      subtitle: 'Manage room assignments and availability',
      allocationGrid: 'Allocation Grid',
      timeline: 'Timeline View',
      calendar: 'Calendar View',
      
      // Actions
      assignRoom: 'Assign Room',
      changeRoom: 'Change Room',
      blockRoom: 'Block Room',
      unblockRoom: 'Unblock Room',
      autoAssign: 'Auto Assign',
      
      // Room Blocks
      roomBlocks: 'Room Blocks',
      createBlock: 'Create Block',
      editBlock: 'Edit Block',
      deleteBlock: 'Delete Block',
      blockReason: 'Block Reason',
      maintenance: 'Maintenance',
      renovation: 'Renovation',
      vipReserved: 'VIP Reserved',
      groupBooking: 'Group Booking',
      
      // Allocation Rules
      allocationRules: 'Allocation Rules',
      priority: 'Priority',
      preferences: 'Preferences',
      upgrades: 'Upgrades',
      downgrades: 'Downgrades',
      
      // Status
      unassigned: 'Unassigned',
      assigned: 'Assigned',
      tentative: 'Tentative',
      confirmed: 'Confirmed',
      
      // Optimization
      optimizeAllocation: 'Optimize Allocation',
      allocationScore: 'Allocation Score',
      guestSatisfaction: 'Guest Satisfaction',
      revenueOptimization: 'Revenue Optimization'
    },

    // User Management
    userManagement: {
      title: 'User Management',
      subtitle: 'Manage staff accounts and permissions',
      userList: 'User List',
      newUser: 'New User',
      editUser: 'Edit User',
      deleteUser: 'Delete User',
      
      // User Fields
      userId: 'User ID',
      username: 'Username',
      fullName: 'Full Name',
      email: 'Email',
      phone: 'Phone',
      role: 'Role',
      department: 'Department',
      position: 'Position',
      
      // Roles
      admin: 'Administrator',
      manager: 'Manager',
      receptionist: 'Receptionist',
      housekeeper: 'Housekeeper',
      accountant: 'Accountant',
      staff: 'Staff',
      
      // Permissions
      permissions: 'Permissions',
      accessLevel: 'Access Level',
      fullAccess: 'Full Access',
      readOnly: 'Read Only',
      restricted: 'Restricted',
      
      // Status
      active: 'Active',
      inactive: 'Inactive',
      suspended: 'Suspended',
      locked: 'Locked',
      
      // Actions
      resetPassword: 'Reset Password',
      changePassword: 'Change Password',
      activateAccount: 'Activate Account',
      deactivateAccount: 'Deactivate Account',
      viewActivity: 'View Activity',
      lastLogin: 'Last Login',
      loginHistory: 'Login History'
    },

    // Folio Management
    folio: {
      title: 'Guest Folio Management',
      subtitle: 'View and manage guest folios',
      folioList: 'Folio List',
      folioStatement: 'Folio Statement',
      searchFolios: 'Search by folio number, booking code, or guest name...',
      
      // Folio Details
      folioNumber: 'Folio Number',
      bookingCode: 'Booking Code',
      guestName: 'Guest Name',
      charges: 'Charges',
      credits: 'Credits',
      balance: 'Balance',
      created: 'Created',
      
      // Folio Status
      open: 'Open',
      closed: 'Closed',
      
      // Actions
      viewFolio: 'View Folio',
      printFolio: 'Print Folio',
      exportFolio: 'Export Folio',
      closeFolio: 'Close Folio',
      
      // Pagination
      showingFolios: 'Showing {start} to {end} of {total} folios',
      
      // Loading states
      loadingFolios: 'Loading folios...',
      noFoliosFound: 'No folios found',
      
      // Filters
      filters: 'Filters',
      filterByStatus: 'Filter by status',
      allStatuses: 'All Statuses',
      
      // Table headers
      folio: 'Folio',
      booking: 'Booking',
      guest: 'Guest',
      status: 'Status'
    }
  },
  
  vi: {
    // Navigation
    navigation: {
      dashboard: 'Bảng điều khiển',
      rooms: 'Phòng',
      roomTypes: 'Loại phòng',
      roomAllocation: 'Phân bổ phòng',
      bookings: 'Đặt phòng',
      customers: 'Khách hàng',
      inventory: 'Kho hàng',
      billing: 'Thanh toán',
      pos: 'Bán hàng',
      reports: 'Báo cáo',
      userManagement: 'Quản lý người dùng',
      bankAccounts: 'Tài khoản ngân hàng',
      exchangeRates: 'Tỷ giá hối đoái',
      settings: 'Cài đặt',
      logout: 'Đăng xuất',
      profile: 'Hồ sơ'
    },

    // Authentication
    auth: {
      login: 'Đăng nhập',
      logout: 'Đăng xuất',
      signIn: 'Đăng nhập',
      signUp: 'Đăng ký',
      email: 'Email',
      password: 'Mật khẩu',
      confirmPassword: 'Xác nhận mật khẩu',
      forgotPassword: 'Quên mật khẩu?',
      resetPassword: 'Đặt lại mật khẩu',
      rememberMe: 'Ghi nhớ đăng nhập',
      loginSuccess: 'Đăng nhập thành công',
      loginFailed: 'Đăng nhập thất bại',
      invalidCredentials: 'Email hoặc mật khẩu không đúng',
      sessionExpired: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại',
      unauthorized: 'Truy cập không được phép',
      welcomeBack: 'Chào mừng trở lại',
      hotelManagementSystem: 'Hệ thống quản lý khách sạn'
    },

    // Dashboard
    dashboard: {
      title: 'Bảng điều khiển',
      overview: 'Tổng quan',
      welcomeMessage: 'Chào mừng đến với Hệ thống quản lý khách sạn',
      todayStatistics: 'Thống kê hôm nay',
      monthlyStatistics: 'Thống kê tháng',
      
      // KPI Cards
      totalRooms: 'Tổng số phòng',
      occupiedRooms: 'Phòng đang ở',
      availableRooms: 'Phòng trống',
      occupancyRate: 'Tỷ lệ lấp đầy',
      todayCheckIns: 'Nhận phòng hôm nay',
      todayCheckOuts: 'Trả phòng hôm nay',
      totalGuests: 'Tổng số khách',
      totalCustomers: 'Tổng khách hàng',
      todayRevenue: 'Doanh thu hôm nay',
      monthRevenue: 'Doanh thu tháng',
      pendingPayments: 'Thanh toán chờ',
      averageRoomRate: 'Giá phòng trung bình',
      
      // Detailed descriptions
      currentOccupancy: 'Công suất hiện tại',
      totalRevenueToday: 'Tổng doanh thu hôm nay',
      revenueThisMonth: 'Doanh thu tháng này',
      arrivalsScheduled: 'Lịch đến dự kiến',
      departuresScheduled: 'Lịch trả phòng dự kiến',
      registeredCustomers: 'Khách hàng đã đăng ký',
      outstandingBalance: 'Số dư chưa thanh toán',
      
      // Recent Activity
      recentActivity: 'Hoạt động gần đây',
      latestBookingsAndCheckIns: 'Đặt phòng và nhận phòng mới nhất',
      newBookingReceived: 'Nhận được đặt phòng mới',
      checkInCompleted: 'Hoàn tất nhận phòng',
      paymentReceived: 'Nhận được thanh toán',
      
      // Quick Actions detailed
      quickActionsDescription: 'Các tác vụ và thao tác thông dụng',
      createReservation: 'Tạo đặt phòng',
      processArrival: 'Xử lý nhận phòng',
      createBilling: 'Tạo hóa đơn',
      analyticsInsights: 'Phân tích & thống kê',
      
      // Charts
      revenueChart: 'Tổng quan doanh thu',
      occupancyChart: 'Xu hướng lấp đầy',
      bookingSourceChart: 'Nguồn đặt phòng',
      roomStatusChart: 'Phân bố trạng thái phòng',
      
      // Quick Actions
      quickActions: 'Thao tác nhanh',
      newBooking: 'Đặt phòng mới',
      checkIn: 'Nhận phòng',
      checkOut: 'Trả phòng',
      viewReports: 'Xem báo cáo',
      checkInGuest: 'Nhận phòng khách',
      generateInvoice: 'Tạo hóa đơn'
    },

    // Customers
    customers: {
      title: 'Quản lý khách hàng',
      subtitle: 'Quản lý hồ sơ và lịch sử khách hàng',
      customerList: 'Danh sách khách hàng',
      newCustomer: 'Khách hàng mới',
      editCustomer: 'Sửa khách hàng',
      deleteCustomer: 'Xóa khách hàng',
      customerDetails: 'Chi tiết khách hàng',
      searchCustomers: 'Tìm kiếm khách hàng...',
      
      // Fields
      customerId: 'Mã khách hàng',
      fullName: 'Họ và tên',
      firstName: 'Tên',
      lastName: 'Họ',
      email: 'Email',
      phone: 'Điện thoại',
      alternatePhone: 'Điện thoại phụ',
      dateOfBirth: 'Ngày sinh',
      nationality: 'Quốc tịch',
      idType: 'Loại giấy tờ',
      idNumber: 'Số giấy tờ',
      address: 'Địa chỉ',
      city: 'Thành phố',
      state: 'Tỉnh/Bang',
      country: 'Quốc gia',
      postalCode: 'Mã bưu điện',
      
      // Preferences
      preferences: 'Sở thích',
      roomPreferences: 'Sở thích phòng',
      dietaryRestrictions: 'Hạn chế ăn uống',
      specialRequests: 'Yêu cầu đặc biệt',
      languagePreference: 'Ngôn ngữ ưa thích',
      communicationPreference: 'Cách liên lạc ưa thích',
      
      // History
      bookingHistory: 'Lịch sử đặt phòng',
      paymentHistory: 'Lịch sử thanh toán',
      totalBookings: 'Tổng đặt phòng',
      totalSpent: 'Tổng chi tiêu',
      lastVisit: 'Lần ghé thăm cuối',
      memberSince: 'Thành viên từ',
      loyaltyPoints: 'Điểm thưởng',
      vipStatus: 'Trạng thái VIP',
      
      // Status
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      blacklisted: 'Danh sách đen',
      vip: 'VIP',
      regular: 'Thường'
    },

    // Inventory
    inventory: {
      title: 'Quản lý kho hàng',
      enhancedTitle: 'Hệ thống quản lý khách sạn',
      subtitle: 'Quản lý hàng hóa và vật tư',
      enhancedSubtitle: 'Quản lý kho hàng toàn diện với các tính năng nâng cao',
      enhancedFeatures: 'Tính năng nâng cao',
      dashboard: 'Bảng điều khiển kho',
      overview: 'Tổng quan',
      analyticsInsights: 'Phân tích & thông tin chi tiết',
      products: 'Sản phẩm',
      categories: 'Danh mục',
      suppliers: 'Nhà cung cấp',
      purchaseOrders: 'Đơn đặt hàng',
      stockMovements: 'Biến động kho',
      stockValue: 'Tồn kho',
      lowStockItems: 'Mặt hàng sắp hết',
      pendingApproval: 'Chờ duyệt',
      recipesBOM: 'Công thức & BOM',
      activeRecipes: 'Công thức đang dùng',
      reports: 'Báo cáo',
      analytics: 'Phân tích',
      recipeManagement: 'Quản lý công thức & BOM',
      recipeDescription: 'Tạo và quản lý công thức với danh sách nguyên liệu cho sản xuất thực phẩm và theo dõi tiêu thụ kho.',
      createRecipe: 'Tạo công thức',
      inventoryDashboard: 'Bảng điều khiển kho',
      dashboardOverview: 'Tổng quan hệ thống quản lý kho của bạn',
      recentMovements: 'Biến động gần đây',
      topProducts: 'Sản phẩm hàng đầu',
      byCategory: 'Theo danh mục',
      
      // Products
      productList: 'Danh sách sản phẩm',
      newProduct: 'Sản phẩm mới',
      editProduct: 'Sửa sản phẩm',
      deleteProduct: 'Xóa sản phẩm',
      productName: 'Tên sản phẩm',
      productCode: 'Mã sản phẩm',
      category: 'Danh mục',
      unit: 'Đơn vị',
      currentStock: 'Tồn kho hiện tại',
      minimumStock: 'Tồn kho tối thiểu',
      maximumStock: 'Tồn kho tối đa',
      reorderLevel: 'Mức đặt hàng lại',
      unitPrice: 'Đơn giá',
      sellingPrice: 'Giá bán',
      
      // Stock
      stockIn: 'Nhập kho',
      stockOut: 'Xuất kho',
      stockAdjustment: 'Điều chỉnh kho',
      stockTransfer: 'Chuyển kho',
      stockCount: 'Kiểm kê',
      lowStock: 'Sắp hết hàng',
      outOfStock: 'Hết hàng',
      inStock: 'Còn hàng',
      expiryDate: 'Ngày hết hạn',
      batchNumber: 'Số lô',
      
      // Purchase Orders
      newPurchaseOrder: 'Đơn đặt hàng mới',
      orderNumber: 'Số đơn hàng',
      orderDate: 'Ngày đặt hàng',
      supplier: 'Nhà cung cấp',
      expectedDelivery: 'Dự kiến giao hàng',
      orderStatus: 'Trạng thái đơn',
      totalItems: 'Tổng mặt hàng',
      totalAmount: 'Tổng tiền',
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      received: 'Đã nhận',
      cancelled: 'Đã hủy',
      
      // Purchase Order Management
      createOrder: 'Tạo đơn hàng',
      draftOrders: 'Đơn nháp',
      pendingOrders: 'Đang chờ',
      totalOrders: 'Tổng đơn hàng',
      totalValue: 'Tổng giá trị',
      allOrders: 'Tất cả đơn hàng',
      draft: 'Nháp',
      submitted: 'Đã gửi',
      partial: 'Một phần',
      submit: 'Gửi',
      approve: 'Duyệt',
      receiveOrder: 'Nhận hàng',
      markAsComplete: 'Đánh dấu hoàn thành',
      orderDetails: 'Chi tiết đơn hàng',
      orderInformation: 'Thông tin đơn hàng',
      supplierInformation: 'Nhà cung cấp',
      contactPerson: 'Người liên hệ',
      email: 'Email',
      phone: 'Điện thoại',
      orderItems: 'Mặt hàng',
      product: 'Sản phẩm',
      sku: 'Mã SKU',
      unitCost: 'Đơn giá',
      receivedQuantity: 'Đã nhận',
      itemsToReceive: 'Hàng cần nhận',
      specifyQuantities: 'Nhập số lượng hàng bạn đang nhận cho mỗi mặt hàng',
      previouslyReceived: 'Đã nhận trước',
      remaining: 'Còn lại',
      receivingNow: 'Đang nhận',
      complete: 'Hoàn thành',
      willComplete: 'Sẽ hoàn thành',
      completion: 'Hoàn thành',
      deliveryNotes: 'Ghi chú giao hàng',
      deliveryNotesPlaceholder: 'Thêm ghi chú về tình trạng giao hàng, hư hỏng, sai khác, v.v.',
      totalItemsReceiving: 'Tổng số hàng đang nhận',
      partialDelivery: 'Giao hàng một phần',
      orderComplete: 'Đơn hàng hoàn thành',
      notSet: 'Chưa đặt',
      manageProcurement: 'Quản lý mua hàng và nhận kho',
      
      // Tabs
      tabDashboard: 'Bảng điều khiển',
      tabProducts: 'Sản phẩm',
      tabOrders: 'Đơn hàng',
      tabRecipes: 'Công thức',
      tabReports: 'Báo cáo',
      tabAnalytics: 'Phân tích',
      
      // Recipe Management
      recipeBOMManagement: 'Quản lý Công thức & BOM',
      
      // Reports
      stockValuationReport: 'Báo cáo Định giá Kho',
      stockValuationDescription: 'Định giá hàng tồn kho chi tiết sử dụng phương pháp FIFO, LIFO hoặc giá trung bình.',
      generateReport: 'Tạo Báo cáo',
      movementAnalysis: 'Phân tích Di chuyển',
      movementAnalysisDescription: 'Theo dõi di chuyển sản phẩm, mẫu tiêu thụ và vận tốc.',
      purchaseAnalysis: 'Phân tích Mua hàng',
      purchaseAnalysisDescription: 'Phân tích đơn mua hàng, hiệu suất nhà cung cấp và xu hướng chi phí.',
      abcAnalysis: 'Phân tích ABC',
      abcAnalysisDescription: 'Phân loại hàng tồn kho dựa trên giá trị tiêu thụ và tầm quan trọng.',
      expiryBatchReport: 'Báo cáo Hạn dùng & Lô',
      expiryBatchDescription: 'Theo dõi hàng sắp hết hạn, số lô và kiểm soát chất lượng.',
      customReports: 'Báo cáo Tùy chỉnh',
      customReportsDescription: 'Tạo báo cáo tùy chỉnh với bộ lọc linh hoạt và xuất dữ liệu.',
      createCustom: 'Tạo Tùy chỉnh',
      
      // Analytics
      inventoryPerformance: 'Hiệu suất Kho hàng',
      turnoverRatio: 'Tỷ lệ Luân chuyển',
      stockAccuracy: 'Độ chính xác Kho',
      carryingCost: 'Chi phí Lưu kho',
      deadStockValue: 'Giá trị Hàng tồn đọng',
      forecasting: 'Dự báo',
      demandForecasting: 'Dự báo Nhu cầu',
      demandForecastingDescription: 'Dự đoán nhu cầu bằng AI dựa trên dữ liệu lịch sử và xu hướng theo mùa.',
      reorderSuggestions: 'Đề xuất Đặt hàng lại',
      reorderSuggestionsDescription: 'Khuyến nghị đặt hàng lại thông minh để tối ưu mức tồn kho và giảm chi phí.',
      viewForecasts: 'Xem Dự báo',
      
      // Dashboard specific
      totalProducts: 'Tổng Sản phẩm',
      activeProducts: 'sản phẩm hoạt động',
      turnover: 'Luân chuyển',
      expiringSoon: 'Sắp hết hạn',
      runningLowStock: 'đang sắp hết hàng',
      expiringSoonText: 'sắp hết hạn',
      recentStockMovements: 'Biến động Kho Gần đây',
      topSellingProducts: 'Sản phẩm Bán chạy nhất',
      sold: 'đã bán',
      revenue: 'doanh thu',
      stockByCategory: 'Kho theo Danh mục',
      items: 'mặt hàng',
      
      // Product Management
      productManagement: 'Quản lý Sản phẩm',
      productManagementSubtitle: 'Quản lý sản phẩm và mức tồn kho của bạn',
      addProduct: 'Thêm Sản phẩm',
      searchProducts: 'Tìm kiếm sản phẩm...',
      productStatus: 'Trạng thái Sản phẩm',
      allStatus: 'Tất cả Trạng thái',
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      discontinued: 'Ngừng kinh doanh',
      stockStatus: 'Trạng thái Kho',
      allStock: 'Tất cả Kho',
      loadingProducts: 'Đang tải sản phẩm',
      stock: 'Kho',
      value: 'Giá trị',
      status: 'Trạng thái',
      actions: 'Hành động',
      uncategorized: 'Chưa phân loại',
      min: 'Tối thiểu',
      avg: 'TB',
      adjustStock: 'Điều chỉnh Kho',
      noProductsFound: 'Không tìm thấy sản phẩm',
      
      // Empty states
      noRecentMovements: 'Không có Biến động Gần đây',
      noRecentMovementsDescription: 'Các biến động kho sẽ xuất hiện ở đây khi bạn bắt đầu nhận sản phẩm hoặc thực hiện bán hàng.',
      noTopProducts: 'Không có Sản phẩm Hàng đầu',
      noTopProductsDescription: 'Các sản phẩm bán chạy nhất sẽ hiển thị ở đây dựa trên dữ liệu bán hàng.',
      noCategoryData: 'Không có Dữ liệu Danh mục',
      noCategoryDataDescription: 'Dữ liệu phân loại kho sẽ xuất hiện ở đây khi bạn thêm sản phẩm có danh mục.'
    },

    // Billing
    billing: {
      title: 'Thanh toán & Hóa đơn',
      subtitle: 'Quản lý hóa đơn và thanh toán',
      dashboard: 'Bảng điều khiển thanh toán',
      invoices: 'Hóa đơn',
      payments: 'Thanh toán',
      folios: 'Sổ khách',
      
      // Invoices
      invoiceList: 'Danh sách hóa đơn',
      newInvoice: 'Hóa đơn mới',
      editInvoice: 'Sửa hóa đơn',
      deleteInvoice: 'Xóa hóa đơn',
      invoiceNumber: 'Số hóa đơn',
      invoiceDate: 'Ngày hóa đơn',
      dueDate: 'Hạn thanh toán',
      billTo: 'Người thanh toán',
      items: 'Các mục',
      subtotal: 'Tạm tính',
      tax: 'Thuế',
      discount: 'Giảm giá',
      total: 'Tổng cộng',
      paid: 'Đã thanh toán',
      balance: 'Còn lại',
      
      // Payment
      paymentList: 'Danh sách thanh toán',
      recordPayment: 'Ghi nhận thanh toán',
      paymentMethod: 'Phương thức thanh toán',
      paymentDate: 'Ngày thanh toán',
      paymentAmount: 'Số tiền thanh toán',
      reference: 'Tham chiếu',
      cash: 'Tiền mặt',
      card: 'Thẻ',
      bankTransfer: 'Chuyển khoản',
      onlinePayment: 'Thanh toán trực tuyến',
      
      // QR Payment
      qrPayment: 'Thanh toán QR',
      generateQR: 'Tạo mã QR',
      scanToPay: 'Quét để thanh toán',
      paymentConfirmed: 'Đã xác nhận thanh toán',
      waitingForPayment: 'Đang chờ thanh toán',
      
      // Status
      draft: 'Nháp',
      sent: 'Đã gửi',
      viewed: 'Đã xem',
      partiallyPaid: 'Thanh toán một phần',
      fullPaid: 'Thanh toán đầy đủ',
      overdue: 'Quá hạn',
      cancelled: 'Đã hủy'
    },

    // POS
    pos: {
      title: 'Điểm bán hàng',
      subtitle: 'Xử lý bán hàng và giao dịch',
      terminal: 'Máy POS',
      products: 'Sản phẩm',
      cart: 'Giỏ hàng',
      checkout: 'Thanh toán',
      
      // Shift
      shiftManagement: 'Quản lý ca',
      openShift: 'Mở ca',
      closeShift: 'Đóng ca',
      shiftReport: 'Báo cáo ca',
      cashFloat: 'Tiền đầu ca',
      cashCount: 'Kiểm tiền',
      
      // Cart
      addToCart: 'Thêm vào giỏ',
      removeFromCart: 'Xóa',
      clearCart: 'Xóa giỏ hàng',
      quantity: 'SL',
      unitPrice: 'Đơn giá',
      totalPrice: 'Thành tiền',
      itemsInCart: 'Sản phẩm trong giỏ',
      
      // Customer
      selectCustomer: 'Chọn khách hàng',
      walkInCustomer: 'Khách vãng lai',
      roomCharge: 'Tính vào phòng',
      chargeToRoom: 'Tính vào phòng',
      
      // Payment
      paymentMethod: 'Phương thức thanh toán',
      splitPayment: 'Chia thanh toán',
      cashReceived: 'Tiền nhận',
      change: 'Tiền thối',
      processPayment: 'Xử lý thanh toán',
      printReceipt: 'In hóa đơn',
      emailReceipt: 'Gửi hóa đơn qua email',
      
      // Categories
      allCategories: 'Tất cả danh mục',
      food: 'Thức ăn',
      beverages: 'Đồ uống',
      snacks: 'Đồ ăn nhẹ',
      amenities: 'Tiện nghi',
      services: 'Dịch vụ',
      
      // Transaction
      transactionComplete: 'Giao dịch thành công',
      transactionFailed: 'Giao dịch thất bại',
      voidTransaction: 'Hủy giao dịch',
      refund: 'Hoàn tiền'
    },

    // Reports
    reports: {
      title: 'Báo cáo & Phân tích',
      subtitle: 'Xem thông tin chi tiết và tạo báo cáo',
      dashboard: 'Bảng điều khiển báo cáo',
      
      // Report Types
      occupancyReport: 'Báo cáo công suất',
      revenueReport: 'Báo cáo doanh thu',
      bookingReport: 'Báo cáo đặt phòng',
      guestReport: 'Báo cáo khách',
      housekeepingReport: 'Báo cáo dọn phòng',
      inventoryReport: 'Báo cáo kho',
      financialReport: 'Báo cáo tài chính',
      customReport: 'Báo cáo tùy chỉnh',
      
      // Filters
      dateRange: 'Khoảng thời gian',
      reportPeriod: 'Kỳ báo cáo',
      daily: 'Hàng ngày',
      weekly: 'Hàng tuần',
      monthly: 'Hàng tháng',
      quarterly: 'Hàng quý',
      yearly: 'Hàng năm',
      custom: 'Tùy chỉnh',
      
      // Metrics
      totalRevenue: 'Tổng doanh thu',
      averageDailyRate: 'Giá phòng trung bình/ngày',
      revenuePerAvailableRoom: 'Doanh thu/phòng',
      occupancyPercentage: 'Tỷ lệ lấp đầy %',
      totalBookings: 'Tổng đặt phòng',
      cancelledBookings: 'Đặt phòng đã hủy',
      noShowRate: 'Tỷ lệ không đến',
      
      // Actions
      generateReport: 'Tạo báo cáo',
      exportPDF: 'Xuất PDF',
      exportExcel: 'Xuất Excel',
      exportCSV: 'Xuất CSV',
      printReport: 'In báo cáo',
      emailReport: 'Gửi báo cáo qua email',
      scheduleReport: 'Lên lịch báo cáo',
      saveReport: 'Lưu báo cáo'
    },

    // Room Allocation
    roomAllocation: {
      title: 'Phân bổ phòng',
      subtitle: 'Quản lý phân phòng và khả dụng',
      allocationGrid: 'Lưới phân bổ',
      timeline: 'Xem dòng thời gian',
      calendar: 'Xem lịch',
      
      // Actions
      assignRoom: 'Phân phòng',
      changeRoom: 'Đổi phòng',
      blockRoom: 'Khóa phòng',
      unblockRoom: 'Mở khóa phòng',
      autoAssign: 'Tự động phân',
      
      // Room Blocks
      roomBlocks: 'Khóa phòng',
      createBlock: 'Tạo khóa',
      editBlock: 'Sửa khóa',
      deleteBlock: 'Xóa khóa',
      blockReason: 'Lý do khóa',
      maintenance: 'Bảo trì',
      renovation: 'Cải tạo',
      vipReserved: 'Giữ cho VIP',
      groupBooking: 'Đặt phòng nhóm',
      
      // Allocation Rules
      allocationRules: 'Quy tắc phân bổ',
      priority: 'Ưu tiên',
      preferences: 'Sở thích',
      upgrades: 'Nâng cấp',
      downgrades: 'Hạ cấp',
      
      // Status
      unassigned: 'Chưa phân',
      assigned: 'Đã phân',
      tentative: 'Tạm thời',
      confirmed: 'Đã xác nhận',
      
      // Optimization
      optimizeAllocation: 'Tối ưu phân bổ',
      allocationScore: 'Điểm phân bổ',
      guestSatisfaction: 'Hài lòng khách hàng',
      revenueOptimization: 'Tối ưu doanh thu'
    },

    // User Management
    userManagement: {
      title: 'Quản lý người dùng',
      subtitle: 'Quản lý tài khoản nhân viên và quyền hạn',
      userList: 'Danh sách người dùng',
      newUser: 'Người dùng mới',
      editUser: 'Sửa người dùng',
      deleteUser: 'Xóa người dùng',
      
      // User Fields
      userId: 'Mã người dùng',
      username: 'Tên đăng nhập',
      fullName: 'Họ và tên',
      email: 'Email',
      phone: 'Điện thoại',
      role: 'Vai trò',
      department: 'Phòng ban',
      position: 'Chức vụ',
      
      // Roles
      admin: 'Quản trị viên',
      manager: 'Quản lý',
      receptionist: 'Lễ tân',
      housekeeper: 'Nhân viên dọn phòng',
      accountant: 'Kế toán',
      staff: 'Nhân viên',
      
      // Permissions
      permissions: 'Quyền hạn',
      accessLevel: 'Mức truy cập',
      fullAccess: 'Toàn quyền',
      readOnly: 'Chỉ đọc',
      restricted: 'Hạn chế',
      
      // Status
      active: 'Hoạt động',
      inactive: 'Không hoạt động',
      suspended: 'Tạm ngưng',
      locked: 'Đã khóa',
      
      // Actions
      resetPassword: 'Đặt lại mật khẩu',
      changePassword: 'Đổi mật khẩu',
      activateAccount: 'Kích hoạt tài khoản',
      deactivateAccount: 'Vô hiệu hóa tài khoản',
      viewActivity: 'Xem hoạt động',
      lastLogin: 'Đăng nhập lần cuối',
      loginHistory: 'Lịch sử đăng nhập'
    },

    // Folio Management
    folio: {
      title: 'Quản lý sổ khách',
      subtitle: 'Xem và quản lý sổ khách',
      folioList: 'Danh sách sổ khách',
      folioStatement: 'Bảng kê sổ khách',
      searchFolios: 'Tìm theo số sổ, mã đặt phòng hoặc tên khách...',
      
      // Folio Details
      folioNumber: 'Số sổ',
      bookingCode: 'Mã đặt phòng',
      guestName: 'Tên khách',
      charges: 'Chi phí',
      credits: 'Tín dụng',
      balance: 'Số dư',
      created: 'Tạo lúc',
      
      // Folio Status
      open: 'Đang mở',
      closed: 'Đã đóng',
      
      // Actions
      viewFolio: 'Xem sổ khách',
      printFolio: 'In sổ khách',
      exportFolio: 'Xuất sổ khách',
      closeFolio: 'Đóng sổ khách',
      
      // Pagination
      showingFolios: 'Hiển thị {start} đến {end} trong tổng {total} sổ khách',
      
      // Loading states
      loadingFolios: 'Đang tải sổ khách...',
      noFoliosFound: 'Không tìm thấy sổ khách nào',
      
      // Filters
      filters: 'Bộ lọc',
      filterByStatus: 'Lọc theo trạng thái',
      allStatuses: 'Tất cả trạng thái',
      
      // Table headers
      folio: 'Sổ khách',
      booking: 'Đặt phòng',
      guest: 'Khách',
      status: 'Trạng thái'
    }
  }
};