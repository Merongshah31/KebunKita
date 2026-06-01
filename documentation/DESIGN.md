# KebunKita Frontend Design Document

## Purpose

This document captures the current frontend design direction for KebunKita based on the provided mobile UI references. It should guide the web frontend and future Flutter implementation so both experiences feel like the same product.

This document is a living reference. More UX/UI screens can be added later.

## Design Direction

KebunKita should feel:

- Calm and nature-focused.
- Friendly for beginner growers.
- Clean, mobile-first, and easy to scan.
- Community-oriented rather than purely technical.
- Practical, with clear next actions on every screen.

The visual language uses soft green tones, rounded panels, plant imagery, simple icons, and spacious layouts.

## Target Platforms

### Free Web App

- Opened in browser.
- Uses temporary guest account.
- Limited by the User Access Function table.
- Should be simple enough for visitors to test quickly during the event.

### Premium Flutter App

- Full mobile app experience.
- Full access to all features.
- Supports mobile-first actions such as camera capture, saved plant journey, push notifications, and community features.

## Screen Inventory From Current References

| Screen | Purpose | Notes |
| --- | --- | --- |
| Onboarding | Introduce KebunKita mission | Strong headline, short value proposition, two feature cards, primary CTA |
| Login | Existing user authentication | Garden photo background, centered login card, social login options |
| Create Account | New user registration | Name, email, password, social signup, terms links |
| Home Dashboard | Main app landing screen | Greeting, My Garden summary, Plant Help, Local Highlights, bottom navigation |
| Growth Guide List | Browse plant guide content | Search, seasonal recommendations, popular crops, community tips |
| Growth Guide Detail | Learn plant-specific care | Hero crop image, care cards, overview, pro tip, step-by-step guide |
| Join Community | Discover nearby communities | Search, nearby community cards, invite, map view, create hub shortcut |
| Create Community | Create local growing group | Community image, fields, public/private toggles, launch CTA |
| Maps | Find nearby places or communities | Map markers, location card, join action |
| My Garden | Manage planted crops | Crop cards, growth progress, water state, care reminders, add plant CTA |
| Add New Plant | Add crop to garden | Photo upload/capture, plant name, plant type chips, planted date, care requirements |
| Crop Details | Monitor individual crop | Hero image, active growth badge, location, growth status, care history, log water CTA |
| Log Water Success | Confirm completed care action | Watered success state, next watering, soil moisture, back to garden CTA |
| AI Tools | Access smart plant tools | Weather/context card, disease detection, smart care guide, crop recommendation |
| Camera Function | Capture plant issue | Full-screen camera, affected-area instruction, capture button, gallery, lighting/focus hints |
| Community Feed | Browse community posts | Share composer, harvest posts, question cards, tip cards, likes/comments/share |
| Community Post | Create feed post | Text area, media picker, category chips, plant tag, location |
| Marketplace | Browse produce and barter items | Search, filters, community deals, nearby produce grid |
| Listing Details | View market listing | Product image, certification, price, seller card, tags, description, barter and trade actions |
| Barter | Offer crop exchange | Requested item, user garden selection, offer summary, optional message, trade CTA |
| Chat Conversation | Negotiate barter | Messages, barter proposal card, product images, offer barter CTA |
| Successful Trade | Confirm barter completion | Trade summary, seller card, return to chat/home actions |

## Navigation Model

The mobile experience uses a bottom navigation structure:

- Home
- Feed
- Market
- Garden
- Profile

Suggested mapping for KebunKita modules:

| Navigation Item | Main Content |
| --- | --- |
| Home | Dashboard, garden status, plant help, highlights |
| Feed | Community tips, posts, local updates |
| Market | Community exchange, barter, available harvests |
| Garden | My plants, smart farming tasks, growth guides |
| Profile | Account, access level, settings, saved history |

## Primary User Journeys

### 1. First-Time User

1. User opens onboarding.
2. User reads value proposition.
3. User taps Get Started.
4. User creates account or continues as temporary guest on web.
5. User reaches Home Dashboard.

### 2. Returning User

1. User opens Login.
2. User enters email and password or uses social login.
3. User lands on Home Dashboard.
4. User continues plant care or community activity.

### 3. Plant Help Journey

1. User opens Home Dashboard.
2. User selects AI Diagnosis or Growth Guide.
3. For AI Diagnosis, user uploads or captures plant image.
4. System analyzes image and returns guidance.
5. For Growth Guide, user browses crop guides and opens details.

### 4. Growth Guide Journey

1. User opens Growth Guide list.
2. User searches for plants or tips.
3. User views seasonal recommendations.
4. User selects a crop.
5. User reads overview, care requirements, pro tip, and step-by-step guide.

### 5. Community Journey

1. User opens Join Community.
2. User searches neighborhood or views nearby communities.
3. User joins a community or opens map view.
4. User can create a community if no suitable community exists.

### 6. Exchange Journey

1. User views Local Highlights or Market.
2. User selects available harvest item.
3. User checks what the owner is looking for.
4. User starts barter/trade flow.

### 7. Garden Management Journey

1. User opens Garden.
2. User views planted crops and care reminders.
3. User taps Add New Plant to register a crop.
4. User uploads or captures a plant photo.
5. User enters plant name, type, planted date, sunlight, and watering frequency.
6. User saves the plant to My Garden.
7. User can open Crop Details to monitor growth and care history.

### 8. Care Logging Journey

1. User opens My Garden or Crop Details.
2. User selects a care action such as Log Water.
3. System records the care activity.
4. User sees a success confirmation.
5. User returns to Garden with updated status and next reminder.

### 9. AI Diagnosis Journey

1. User opens AI Tools or Plant Help.
2. User selects AI Disease Detection.
3. User opens camera or uploads from gallery.
4. Camera screen asks user to point at the affected area.
5. User captures image.
6. System sends image to backend for analysis.
7. User receives diagnosis, confidence, and care recommendation.

### 10. Community Feed Posting Journey

1. User opens Feed.
2. User taps the share composer.
3. User writes a post and adds photos or media.
4. User chooses a category such as Harvest, Question, or Advice.
5. User optionally tags a plant and location.
6. User publishes the post.
7. Community members can like, comment, share, or suggest a solution.

### 11. Barter Chat Journey

1. User opens a marketplace listing or local highlight.
2. User taps Message to Barter or Trade Now.
3. User negotiates in chat.
4. User opens the barter offer screen.
5. User selects produce from their garden.
6. User reviews offer summary.
7. User submits the trade offer.
8. When accepted, the success screen confirms the completed trade.

## Visual System

### Colors

Primary palette:

- Deep green: primary actions, headings, selected states.
- Soft green: backgrounds, tags, icon containers.
- Off-white: page background.
- White: cards and forms.
- Brown: market, soil, community accent.
- Soft peach: warnings, tips, and secondary highlights.

Suggested tokens:

| Token | Usage |
| --- | --- |
| `primaryGreen` | Main buttons, active icons, important headings |
| `lightGreen` | Icon backgrounds, badges, calm panels |
| `pageBackground` | App background |
| `cardBackground` | Cards, forms, content sections |
| `soilBrown` | Market/community accents |
| `tipPeach` | Pro tips and helpful notes |
| `textDark` | Main readable text |
| `textMuted` | Secondary text |

### Typography

The UI uses rounded, friendly sans-serif styling.

Guidelines:

- Use large bold headings for screen titles and greetings.
- Use medium-weight section titles.
- Use short readable body text.
- Keep form labels clear and direct.
- Avoid long text blocks inside cards.

### Imagery

Images are important to the product identity.

Use images for:

- Crop hero sections.
- Community banners.
- Local highlight cards.
- Onboarding background or garden context.
- Map preview cards and community thumbnails.

Image style:

- Bright natural crops and gardens.
- Realistic food and plant photos.
- Avoid overly dark or decorative-only images.

### Icons

Icons should be simple line icons with rounded forms.

Common icon categories:

- Plant/garden
- Water
- Sun/light
- Soil/leaf
- Calendar/harvest
- Community/users
- Market/store
- Search/filter
- Bell/notification
- Map/location

## Component Guidelines

### Header

Use a simple top header with:

- Back arrow on subpages.
- Centered or left-aligned title.
- Notification icon where relevant.
- User avatar on dashboard/community screens.

### Cards

Cards should be rounded, light, and spacious.

Use cards for:

- Garden status.
- Crop recommendations.
- Popular crops.
- Community tips.
- Local highlights.
- Community list items.
- Forms.
- Market listings.
- Barter summaries.
- Chat proposal previews.
- Care history rows.
- Success confirmations.

### Buttons

Primary buttons:

- Deep green background.
- White text.
- Rounded pill shape.
- Clear action label.

Secondary buttons:

- Light background.
- Green or dark text.
- Border when needed.

### Forms

Form fields should:

- Use soft green or white backgrounds.
- Include icon prefix where helpful.
- Use clear placeholder text.
- Keep vertical spacing generous.

### Bottom Navigation

Bottom navigation should:

- Use five stable destinations: Home, Feed, Market, Garden, Profile.
- Highlight the active tab with green icon and small active dot.
- Keep labels short.
- Stay consistent across dashboard, feed, market, and garden screens.

### Bottom Action Bars

Bottom action bars should:

- Hold primary actions such as Trade Now, Message to Barter, Log Water, or Back to Garden.
- Use sticky placement on long detail screens when possible.
- Avoid crowding more than two actions.

### Feed Composer

The feed composer should:

- Use a rounded input area with a short prompt.
- Include a camera/photo shortcut.
- Open the full Community Post screen when tapped.

### Marketplace Listing Cards

Marketplace cards should:

- Use strong produce photography.
- Show title, distance, price or swap status.
- Use badges for barter and certification.
- Include quick action icons such as favorite, cart, or exchange.

### Camera Overlay

Camera overlays should:

- Use translucent dark controls.
- Show instruction text near the top-middle.
- Use a visible focus frame.
- Keep the capture button large and reachable.
- Show lighting and focus hints only when useful.

### Chat Bubbles

Chat bubbles should:

- Use white for incoming messages.
- Use primary green for outgoing messages.
- Include timestamps in muted text.
- Support embedded barter proposal cards and image messages.

### Badges

Use badges for:

- High sun.
- Hydration.
- Number of active crops.
- Step count.
- Barter label.
- Access type where needed.
- Organic certified.
- Active growth.
- Harvest category.
- Top pick.
- Watered status.
- Plant type.
- Distance.

## Screen-Level Notes

### Onboarding

Purpose:

- Communicate the mission quickly.
- Move user toward Get Started or Login.

Required elements:

- Strong headline.
- Short support copy.
- Two feature cards: Join Hubs and Exchange.
- Primary Get Started button.
- Secondary existing account button.

### Login

Purpose:

- Allow returning users to access KebunKita.

Required elements:

- Brand label.
- Welcome card.
- Email field.
- Password field.
- Forgot password.
- Login button.
- Google and Facebook options.
- Create Account link.

### Create Account

Purpose:

- Allow new users to create a KebunKita account.

Required elements:

- Full name.
- Email.
- Password.
- Create Account button.
- Social signup buttons.
- Terms and privacy links.
- Login link.

### Home Dashboard

Purpose:

- Show current garden status and main actions.

Required elements:

- Greeting.
- My Garden status cards.
- Plant Help module.
- AI Diagnosis action.
- Growth Guide action.
- Local Highlights list.
- Bottom navigation.

### My Garden

Purpose:

- Let users manage plants and quickly understand what needs attention.

Required elements:

- Header with profile/avatar and notification.
- Garden Dashboard label.
- Add New Plant button.
- Plant cards with image, name, type badge, planted date, growth progress, sunlight/water status.
- Expand Your Garden empty-capacity card.
- Care Reminders list.
- Bottom navigation with Garden selected.

Design notes:

- Use progress bars for crop growth.
- Make urgent care states visible with red or warning accent.
- Keep each crop card scannable with one primary status.

### Add New Plant

Purpose:

- Add a crop profile into the user garden.

Required elements:

- Back button, title, help icon.
- Plant photo capture/upload area.
- Plant name field.
- Plant type chips.
- Date planted field.
- Care Requirements panel.
- Sunlight selector.
- Watering frequency selector.
- Care reminder toggle.
- Save to Garden CTA.

Design notes:

- Use selected chips with strong green fill.
- Keep optional settings inside the care panel.
- Photo capture/upload should feel like the first required action.

### Crop Details

Purpose:

- Show one crop's growth, location, and care history.

Required elements:

- Hero crop image.
- Active Growth badge.
- Crop name.
- Garden location.
- Growth status percentage.
- Progress bar.
- Planted date and estimated harvest.
- Care history list.
- Log Water CTA.

Design notes:

- The crop image should be visually dominant.
- Growth status should be the main data point.
- Care history rows should show icon, action, time, quantity, and chevron.

### Log Water Success

Purpose:

- Confirm a completed care action and show what happens next.

Required elements:

- Crop image.
- Success heading.
- Hydration confirmation text.
- Next watering card.
- Soil moisture card.
- Back to Garden CTA.

Design notes:

- This should feel calm and rewarding.
- Keep the next action obvious.

### AI Tools

Purpose:

- Provide smart plant support from the Garden area.

Required elements:

- Context card with location, weather, humidity, rain, soil moisture, and UV index.
- AI Disease Detection card.
- Smart Care Guide card.
- Crop Recommendations card.
- Bottom navigation with Garden selected.

Design notes:

- Smart tool cards should feel useful and trustworthy, not gimmicky.
- Weather/context data should explain why recommendations are personalized.

### Camera Function

Purpose:

- Capture a plant image for AI diagnosis.

Required elements:

- Full-screen plant camera view.
- Close button.
- Flash control.
- Help icon.
- Instruction pill: point at affected area.
- Focus frame.
- Capture button.
- Gallery button.
- Auto/assist button.
- Lighting and focus status chips.

Design notes:

- Keep UI controls visible but minimal over the camera.
- The affected-area frame should guide the user without covering too much of the plant.
- Use dark translucent overlays for camera controls.

### Growth Guide List

Purpose:

- Help users discover what to grow and learn from tips.

Required elements:

- Search bar.
- Filter icon.
- Seasonal Recommendations carousel.
- Popular Crops grid.
- Community Growth Tips list.

### Growth Guide Detail

Purpose:

- Teach the user how to grow a selected crop.

Required elements:

- Hero image.
- Crop name and local/common name.
- Water, light, soil, harvest cards.
- Overview.
- Pro tip.
- Step-by-step guide.

### Community Feed

Purpose:

- Show local growing activity and community support.

Required elements:

- Header with avatar and notification.
- Share composer with photo shortcut.
- Harvest post cards.
- Question/help cards.
- Educational tip cards.
- Like, comment, share, bookmark actions.
- Bottom navigation with Feed selected.

Design notes:

- Feed cards can vary by content type but should share spacing and action patterns.
- Question cards may use deeper green to stand apart from regular posts.
- Tip cards should include source/author and save action.

### Community Post

Purpose:

- Let users share harvests, questions, advice, or progress.

Required elements:

- Close button.
- Share Progress title.
- Post button.
- User identity.
- Text area.
- Photo and media picker.
- Uploaded image thumbnails with remove controls.
- Category chips.
- Plant tag field.
- Location field.

Design notes:

- Category chips should make post intent clear.
- The Post button should remain visible at the top.
- Media upload should support multiple images.

### Join Community

Purpose:

- Help users discover nearby growing communities.

Required elements:

- Search field.
- Nearby community list.
- Join buttons.
- Map view shortcut.
- Invite shortcut.
- Create hub/community shortcut.

### Create Community

Purpose:

- Allow users to create a local growth community.

Required elements:

- Community banner image.
- Community name.
- Neighborhood/area.
- Short description.
- Public/private toggle.
- Launch Community button.
- Guidelines note.

### Maps

Purpose:

- Show nearby communities, users, gardens, or market points.

Required elements:

- Search place header.
- Map area.
- Location markers.
- Current location button.
- Selected place card.
- Join action.

### Marketplace

Purpose:

- Let users browse nearby crops, barter offers, and produce listings.

Required elements:

- Header with avatar and notification.
- Search field.
- Filter button.
- Community Deals carousel.
- Nearby Produce grid.
- Listing cards with image, title, distance, price or swap status, favorite, barter badge, and cart/trade icon.
- Bottom navigation with Market selected.

Design notes:

- Product images should be clear and appetizing.
- Barter and price listings should be visually distinguishable.
- Distance should be easy to scan.

### Listing Details

Purpose:

- Show details for a single market listing and start trade/barter.

Required elements:

- Header with back, title, share.
- Large product image.
- Certification badge.
- Product title.
- Price and unit.
- Location.
- Seller profile card with rating.
- Product tags.
- Description.
- Barter ready card.
- Pickup card.
- Message to Barter button.
- Trade Now button.

Design notes:

- Keep product image high quality and inspectable.
- Bottom actions should remain clear and visually balanced.
- Seller trust signals are important.

### Barter

Purpose:

- Let user build an exchange offer.

Required elements:

- Requested item summary.
- Requesting user identity.
- User Garden grid.
- Selected offer item state.
- Filter action.
- Offer summary card.
- Optional message field.
- Trade CTA.

Design notes:

- Selected garden item should have clear border and check mark.
- Offer summary should clearly show You Give and You Get.
- CTA should be disabled until a valid offer item is selected.

### Chat Conversation

Purpose:

- Support negotiation and barter agreement between users.

Required elements:

- Chat header with back, user avatar, name, status/location, call, menu.
- Date divider.
- Incoming and outgoing message bubbles.
- Barter proposal card.
- Product image message.
- Offer Barter quick action.
- Message input with add, emoji, and send controls.

Design notes:

- Outgoing messages use primary green.
- Incoming messages use white card styling.
- Proposal cards should be tappable and visually distinct from text messages.

### Successful Trade

Purpose:

- Confirm a completed barter and provide next actions.

Required elements:

- Trade Completed heading.
- Supportive completion copy.
- Trade summary card.
- Seller/user trust card.
- Return to Chat CTA.
- Return Home secondary CTA.

Design notes:

- Success state should feel celebratory but still calm.
- Trade summary should be easy to screenshot or verify.

## Responsive Web Guidance

The current references are mobile-first. For the browser Web App:

- Use a centered mobile-width layout for hackathon testing when fastest.
- On larger screens, avoid stretching mobile cards too wide.
- Keep bottom navigation or convert to a simple side/top navigation only when needed.
- Preserve the same card hierarchy and green visual language.

## Accessibility Notes

- Maintain readable contrast between green text and pale backgrounds.
- Buttons must have clear labels.
- Form fields need labels, not only placeholders.
- Icons should not be the only way to understand an action.
- Images should include descriptive alt text.

## Temporary Hackathon-Day Design Notes

The free Web App should make guest access clear but not distracting.

Suggested UI:

- Small badge: Guest Mode.
- Usage limit helper text near limited actions.
- Friendly message when limit is reached.
- CTA: Continue with Flutter for full access.

Premium Flutter should avoid limit messaging and present the full product flow.

## Open Design Items

- Final font family.
- Exact color tokens.
- Final logo and app icon.
- Empty states.
- Error states.
- Loading states.
- AI diagnosis result screen.
- AI disease result confidence and treatment layout.
- Trade detail handoff from chat to barter.
- Profile and settings screens.
- Guest limit reached screen.
- Notification center.
- Saved album or plant journey timeline.
- Push notification permission screen.
- Marketplace filter sheet.
- Community detail page after joining.
