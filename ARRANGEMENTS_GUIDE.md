# 🎛️ Link Arrangements - User Control System

## Overview

The Arrangements system gives you **complete control** over how links appear to different users. You can create custom link orders for everyone or specific users, with two powerful modes: automatic time-based ranking or fixed custom order.

---

## 🎯 Features

### 1. **Two Arrangement Modes**

#### Auto Ranking Mode
- **Time-based priority**: Links ranked by time windows and priority boosts
- **Click-based scoring**: Popular links naturally rise to the top
- **Dynamic**: Order updates automatically based on performance
- **No manual work**: Perfect for "set it and forget it" hubs

#### Custom Order Mode
- **Fixed arrangement**: Exact order you specify
- **Drag-and-drop**: Intuitive visual reordering
- **Override everything**: Clicks don't affect position
- **Perfect control**: For featured content, structured flows, or brand priorities

### 2. **Default Arrangement**
- Set arrangement for all users (applies to everyone)
- Choose between Auto or Custom mode
- Override automatic click-based sorting when needed
- Perfect for featured content, promotions, or structured navigation

### 3. **User-Specific Arrangements**
- Create custom arrangements for individual users
- Perfect for VIP users, beta testers, or personalized experiences
- User-specific arrangements **always override** the default
- Each user can have their own unique mode and link order
- **All arrangements are saved permanently** and editable anytime

### 4. **Persistent & Editable**
- All arrangements are saved to the database
- Edit any arrangement anytime by selecting it
- Switch between Auto and Custom mode as needed
- View all saved arrangements in the sidebar

---

## 📖 How to Use

### Accessing Arrangements

1. **Login to Admin Dashboard**
2. **Select your Hub** from the sidebar
3. **Click the "Arrangements" tab** at the top

### Creating a Default Arrangement

1. In the Arrangements panel, click **"Default (All Users)"**
2. **Choose a mode**:
   - **Auto Ranking**: Links sorted by time/priority/clicks automatically
   - **Custom Order**: Fixed order you specify
3. If Custom mode:
   - **Drag links up/down** to reorder them (use the grip icon)
4. Add an optional **description** (e.g., "Featured links first")
5. Click **"Save"**

### Creating User-Specific Arrangements

1. Click **"+ Add User Arrangement"**
2. Enter the **username** (e.g., "john_doe")
3. Click **"Add"**
4. **Choose a mode** (Auto or Custom)
5. If Custom mode:
   - **Drag links** into the desired order for this user
6. Add a **description** (e.g., "VIP user - premium links first")
7. Click **"Save"**

### Editing Existing Arrangements

1. Click on any arrangement in the sidebar
2. It will load with its current mode and order
3. Change mode, reorder links, or update description
4. Click **"Save"** to update

---

## 🎨 Use Cases

### 1. Featured Content
**Scenario:** You want specific links always at the top, regardless of clicks

**Solution:**
- Create a default arrangement
- Place your featured links at positions #1, #2, #3
- Other links will appear below in their click-based order

### 2. VIP Experience
**Scenario:** Premium users should see exclusive content first

**Solution:**
- Create user-specific arrangements for VIP usernames
- Place premium/exclusive links at the top
- VIPs see your custom order, everyone else sees default

### 3. Onboarding Flow
**Scenario:** New users need a guided introduction

**Solution:**
- Create arrangements for new user accounts
- Order links as: "Getting Started" → "Tutorial" → "Documentation"
- After onboarding, switch them to default arrangement

### 4. Regional Customization
**Scenario:** Different regions need different link priorities

**Solution:**
- Create user-specific arrangements per region
- US users see US-relevant links first
- EU users see EU-relevant links first

### 5. Testing & A/B Testing
**Scenario:** Test different link orders with specific users

**Solution:**
- Create arrangements for test user accounts
- Compare analytics between different orderings
- Apply winning arrangement as default

---

## 🔄 How It Works (Behind the Scenes)

### Priority System
1. **User-specific arrangement** (highest priority)
   - If a user has a custom arrangement, use it
2. **Default arrangement** (medium priority)
   - If no user-specific arrangement exists, use default
3. **Click-based ranking** (fallback)
   - If no arrangements exist, sort by clicks + priority boost

### When Links Are Shown
When a user views your hub, the system:
1. Applies all **visibility rules** (time, date, clicks, access control)
2. Filters out hidden links
3. Applies the **arrangement** (user-specific or default)
4. Returns the ordered, visible links

### Combining with Advanced Scheduling
Arrangements work **with** all other features:
- Links still respect time windows
- Date ranges still apply
- Click limits still work
- Access control is still enforced
- Arrangements only affect the **order** of visible links

---

## 💡 Best Practices

### 1. Start with Default
Always create a default arrangement first. This ensures a consistent experience for all users before adding user-specific customizations.

### 2. Use Descriptions
Add clear descriptions to each arrangement:
- ✅ "Holiday promotion - sale links first"
- ✅ "VIP users - premium content prioritized"
- ❌ "Test" or "v2"

### 3. Keep It Simple
Don't create too many user-specific arrangements. Focus on:
- Default for everyone
- VIP/Premium users
- Special test accounts

### 4. Regular Reviews
Check your arrangements periodically:
- Are featured links still relevant?
- Do VIP arrangements need updating?
- Can any user-specific arrangements be removed?

### 5. Combine with Analytics
Use the Analytics tab to see which arrangements perform best, then apply learnings to your default arrangement.

---

## 🎯 Example Scenarios

### Scenario 1: E-commerce Store
```
Default Arrangement:
1. "Summer Sale - 50% Off" (featured promotion)
2. "New Arrivals"
3. "Best Sellers"
4. [Other products by clicks]

VIP Members Arrangement (@vip_member):
1. "Exclusive VIP Preview"
2. "Early Access Sale"
3. "Summer Sale - 50% Off"
4. [Regular products]
```

### Scenario 2: Software Documentation
```
Default Arrangement:
1. "Getting Started"
2. "Installation Guide"
3. "Quick Start Tutorial"
4. [API docs by popularity]

Developer Arrangement (@developer):
1. "API Reference"
2. "Advanced Configuration"
3. "Webhooks Documentation"
4. [Other technical docs]
```

### Scenario 3: Event Registration
```
Default Arrangement (Before Event):
1. "Register Now" (high priority)
2. "Event Schedule"
3. "Speakers"
4. "Venue Information"

Default Arrangement (During Event):
1. "Live Stream"
2. "Q&A Session"
3. "Event Schedule"
4. "Post-Event Survey" (scheduled for later)
```

---

## 🛠️ Technical Details

### API Endpoints
- `GET /api/hubs/:hubId/arrangements` - Fetch arrangement
- `PUT /api/hubs/:hubId/arrangements` - Save/update arrangement

### Request Example
```javascript
PUT /api/hubs/123/arrangements
{
  "username": null,           // null = default, or specific username
  "linkOrder": [5, 3, 1, 2],  // Array of link IDs
  "description": "Featured links first"
}
```

### Database Table
```sql
CREATE TABLE link_arrangements (
  id SERIAL PRIMARY KEY,
  hub_id INTEGER NOT NULL,
  username TEXT,              -- NULL = default
  link_order INTEGER[],       -- Array of link IDs
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

## 🎉 Quick Start

1. **Go to Arrangements tab** in your hub
2. **Click "Default (All Users)"**
3. **Drag your most important link to the top**
4. **Click "Save Order"**
5. **View your public hub** to see the new order!

That's it! Your links now appear in your custom order instead of by clicks.

---

## 🚀 Next Steps

- Combine arrangements with **date-based scheduling** for time-limited orderings
- Use **click limits** to automatically hide links after a threshold
- Set **user-specific access control** for truly personalized experiences
- Check out [ADVANCED_FEATURES.md](ADVANCED_FEATURES.md) for all available controls

**You now have MAXIMUM CONTROL over every aspect of your link hub! 🎛️**
