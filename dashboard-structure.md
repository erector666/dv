# Dashboard Page Structure Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD PAGE                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        DASHBOARD HEADER                                │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ [👤] Welcome back, Nikolcho    [Virt]                         │   │   │
│  │  │      Wed, Sep 24, 2025                                        │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                      SMART SEARCH WIDGET                               │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ 🔍 Search documents... [×][⚙]                                │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                       DASHBOARD STATS                                  │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                      │   │
│  │  │ 📄 9    │ │ 📊 1    │ │ ⚡ 0    │ │ 📈 1.42 │                      │   │
│  │  │ Total   │ │ This    │ │ Process │ │ Storage │                      │   │
│  │  │ Docs    │ │ Week    │ │ ing     │ │ Used    │                      │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        MAIN CONTENT GRID                               │   │
│  │                                                                         │   │
│  │  ┌─────────────────────┐  ┌─────────────────────────────────────────┐   │   │
│  │  │   DASHBOARD SIDEBAR │  │         DASHBOARD CONTENT               │   │   │
│  │  │                     │  │                                         │   │   │
│  │  │ ┌─────────────────┐ │  │ ┌─────────────────────────────────────┐ │   │   │
│  │  │ │  QUICK ACTIONS  │ │  │ │         DOCUMENT LIST               │ │   │   │
│  │  │ │                 │ │  │ │                                     │ │   │   │
│  │  │ │ • Upload Files  │ │  │ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │ │   │   │
│  │  │ │ • Recent Docs   │ │  │ │ │ 📄  │ │ 📄  │ │ 📄  │ │ 📄  │   │ │   │   │
│  │  │ │ • Categories    │ │  │ │ │Doc1 │ │Doc2 │ │Doc3 │ │Doc4 │   │ │   │   │
│  │  │ │ • Settings      │ │  │ │ └─────┘ └─────┘ └─────┘ └─────┘   │ │   │   │
│  │  │ └─────────────────┘ │  │ │                                     │ │   │   │
│  │  │                     │  │ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │ │   │   │
│  │  │ ┌─────────────────┐ │  │ │ │ 📄  │ │ 📄  │ │ 📄  │ │ 📄  │   │ │   │   │
│  │  │ │  QUICK UPLOAD   │ │  │ │ │Doc5 │ │Doc6 │ │Doc7 │ │Doc8 │   │ │   │   │
│  │  │ │                 │ │  │ │ └─────┘ └─────┘ └─────┘ └─────┘   │ │   │   │
│  │  │ │    📤 Upload    │ │  │ │                                     │ │   │   │
│  │  │ │   Drag & Drop   │ │  │ │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │ │   │   │
│  │  │ │                 │ │  │ │ │ 📄  │ │ 📄  │ │ 📄  │ │ 📄  │   │ │   │   │
│  │  │ │ [Choose Files]  │ │  │ │ │Doc9 │ │Doc10│ │Doc11│ │Doc12│   │ │   │   │
│  │  │ └─────────────────┘ │  │ │ └─────┘ └─────┘ └─────┘ └─────┘   │ │   │   │
│  │  └─────────────────────┘  │ └─────────────────────────────────────┘ │   │   │
│  │                           └─────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    DOCUMENT VIEWER MODAL                               │   │
│  │  (Overlay - Only shown when document is selected)                      │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │ [×] Document Viewer                                            │   │   │
│  │  │                                                                 │   │   │
│  │  │ ┌─────────────────────────────────────────────────────────────┐ │   │   │
│  │  │ │                    DOCUMENT CONTENT                        │ │   │   │
│  │  │ │                                                             │ │   │   │
│  │  │ │  [Previous] [Next] [Download] [Share] [Delete]             │ │   │   │
│  │  │ └─────────────────────────────────────────────────────────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

## Component Hierarchy

```
Dashboard (src/pages/Dashboard.tsx)
├── DashboardErrorBoundary
├── DashboardHeader
│   ├── User Avatar (Initial)
│   ├── Welcome Message
│   ├── Date Display
│   └── Performance Toggle (Dev only)
├── SmartSearchWidget
│   ├── Search Input
│   ├── Clear Button
│   ├── Filter Button
│   ├── Filters Panel (Dropdown)
│   └── Search Suggestions (Dropdown)
├── DashboardStats
│   ├── StatsCard (Total Documents)
│   ├── StatsCard (This Week)
│   ├── StatsCard (Processing)
│   └── StatsCard (Storage Used)
├── Main Content Grid
│   ├── DashboardSidebar
│   │   ├── QuickActions
│   │   └── QuickUploadWidget
│   └── DashboardContent
│       └── DocumentList
│           ├── DocumentCard (Multiple)
│           ├── DocumentCardActions
│           ├── BulkOperationsPanel
│           └── Pagination
└── DocumentViewer (Modal)
    ├── Document Content
    ├── Navigation Controls
    └── Action Buttons
```

## Layout Structure

### Mobile (< 768px)
- Single column layout
- Stacked components vertically
- Compact spacing

### Desktop (≥ 768px)
- Grid layout: 1 column sidebar + 3 columns content
- Side-by-side components
- Larger spacing

## Key Features

1. **Ultra-Compact Header**: Minimal height with user info and date
2. **Compact Search**: Small search bar with filters and suggestions
3. **Stats Cards**: 4 key metrics in responsive grid
4. **Sidebar**: Quick actions and upload widget
5. **Document Grid**: Responsive card layout with actions
6. **Modal Viewer**: Full-screen document viewing
7. **Error Boundaries**: Graceful error handling
8. **Loading States**: Skeleton loaders and spinners
9. **Empty States**: Contextual empty state messages
10. **Responsive Design**: Mobile-first approach
