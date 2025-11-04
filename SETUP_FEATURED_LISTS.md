# Featured Lists Feature Setup Guide

## Overview
This guide explains how to set up the new Featured Lists feature that allows you to create carousel slides containing multiple products or deals.

## What's New

### New Database Tables
- **featured_lists**: Stores list definitions (name, type, image, etc.)
- **featured_list_items**: Stores individual items in each list

### New Admin Panel
- **Manage Featured Lists Page**: Create, edit, and delete lists
- **List Form Modal**: Add/remove products or deals to lists

### New Mini-App Feature
- Featured list cards appear in the slider
- Click on a list card to see a grid of all items in that list
- Click on any item to view its details

## Setup Instructions

### Step 1: Run Database Migrations

\`\`\`bash
# From your project root:
psql -U your_db_user -d your_database_name -f scripts/001_add_featured_lists_tables.sql
psql -U your_db_user -d your_database_name -f scripts/002_update_featured_items_constraint.sql
\`\`\`

### Step 2: Restart Backend Server
\`\`\`bash
# Your Node.js backend should automatically pick up the new endpoints
npm restart
# or
pm2 restart telegram-app-backend
\`\`\`

### Step 3: Update Admin Panel Navigation
Add a link to Manage Featured Lists in your admin panel sidebar/navigation:

\`\`\`jsx
import ManageFeaturedListsPage from './pages/ManageFeaturedListsPage';

// In your router/navigation:
{
  path: '/manage-featured-lists',
  label: 'Featured Lists',
  component: ManageFeaturedListsPage
}
\`\`\`

## Usage

### Creating a List via Admin Panel

1. Go to "Manage Featured Lists"
2. Click "Create New List"
3. Fill in:
   - **List Name**: e.g., "Summer Specials"
   - **List Type**: Choose "Products" or "Deals"
   - **Description**: Optional
   - **Custom Image URL**: Image to show in slider
   - **Active**: Toggle to activate/deactivate
   - **Display Order**: Order in slider (lower = first)
4. Select items to add to the list
5. Click "Create List"

### Adding List to Featured Items Slider

1. Go to "Manage Featured Items (Slider)"
2. Click "Add to Slider"
3. Set:
   - **Item Type**: Select "list"
   - **Select Item**: Choose your newly created list
   - **Custom Title**: Optional title override
   - **Custom Image**: Optional image override
   - **Display Order**: Position in slider
4. Click "Create"

### How it Appears

In the mini-app:
1. Featured slider displays the list card with its custom image
2. User clicks the list card to open a modal
3. Modal shows a grid of all products/deals in the list
4. User can click individual items to view details

## API Endpoints

### Featured Lists Management (Admin Only)

\`\`\`
GET    /api/admin/featured-lists              - List all lists
POST   /api/admin/featured-lists              - Create new list
GET    /api/admin/featured-lists/:id          - Get list with items
PUT    /api/admin/featured-lists/:id          - Update list
DELETE /api/admin/featured-lists/:id          - Delete list
POST   /api/admin/featured-lists/:id/items    - Add item to list
DELETE /api/admin/featured-lists/:id/items/:itemId - Remove item from list
\`\`\`

### Featured Lists Public (Available to Mini-App)

\`\`\`
GET    /api/featured-items                    - Get all featured items (includes lists)
GET    /api/featured-items/list/:listId       - Get items in a specific list
\`\`\`

## Database Queries

### View All Lists
\`\`\`sql
SELECT * FROM featured_lists ORDER BY display_order;
\`\`\`

### View List with Item Count
\`\`\`sql
SELECT fl.*, COUNT(fli.id) as item_count
FROM featured_lists fl
LEFT JOIN featured_list_items fli ON fl.id = fli.featured_list_id
GROUP BY fl.id
ORDER BY fl.display_order;
\`\`\`

### View All Items in a List
\`\`\`sql
SELECT 
  fli.id,
  fli.item_type,
  fli.item_id,
  CASE 
    WHEN fli.item_type = 'product' THEN p.name
    WHEN fli.item_type = 'deal' THEN d.title
  END as item_name
FROM featured_list_items fli
LEFT JOIN products p ON fli.item_type = 'product' AND fli.item_id = p.id
LEFT JOIN deals d ON fli.item_type = 'deal' AND fli.item_id = d.id
WHERE fli.featured_list_id = 1  -- Replace 1 with your list ID
ORDER BY fli.display_order;
\`\`\`

### Delete All Items from a List
\`\`\`sql
DELETE FROM featured_list_items WHERE featured_list_id = 1;  -- Replace 1 with list ID
\`\`\`

## Troubleshooting

### Lists Not Showing in Admin Panel
- Check that database migrations were run successfully
- Verify the admin token is valid
- Check browser console for API errors

### List Items Not Loading in Mini-App
- Ensure the list has items added to it
- Check that featured_list_items entries have correct item_ids
- Verify products/deals exist in database

### Can't Add Items to List
- Ensure list type matches item type (products list needs product items)
- Check that products/deals exist in database
- Verify you're not adding duplicate items (unique constraint)

## Example: Creating a List Programmatically

\`\`\`javascript
// Create a list
const listResponse = await adminApiClient.post('/api/admin/featured-lists', {
  list_name: 'New Arrivals',
  list_type: 'products',
  description: 'Latest products',
  is_active: true,
  display_order: 0,
  items: [
    { item_type: 'product', item_id: 5 },
    { item_type: 'product', item_id: 10 },
    { item_type: 'product', item_id: 15 }
  ]
});

// Add to featured items
const featuredResponse = await adminApiClient.post('/api/admin/featured-items', {
  item_type: 'list',
  item_id: listResponse.data.id,
  custom_title: 'New Arrivals',
  display_order: 0,
  is_active: true
});
\`\`\`

## Summary of Files Modified/Created

### Backend
- `telegram-app-backend/routes/admin.js` - Added list management endpoints
- `telegram-app-backend/routes/featuredItems.js` - Added list item fetching endpoint

### Admin Panel
- `platform-admin-panel/src/pages/ManageFeaturedListsPage.jsx` - NEW
- `platform-admin-panel/src/components/FeaturedListFormModal.jsx` - NEW

### Mini-App
- `my-telegram-app/src/components/FeaturedSlider.jsx` - Updated to handle lists
- `my-telegram-app/src/components/modals/FeaturedListModal.jsx` - NEW

### Database
- `scripts/001_add_featured_lists_tables.sql` - NEW
- `scripts/002_update_featured_items_constraint.sql` - NEW

## Next Steps

1. Run the database migrations
2. Restart your backend server
3. Add navigation link to admin panel
4. Start creating featured lists!
